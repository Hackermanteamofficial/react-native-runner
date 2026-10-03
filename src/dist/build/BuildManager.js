"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildManager = void 0;
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const BuildCache_1 = require("./BuildCache");
const BuildDetector_1 = require("./BuildDetector");
const BuildState_1 = require("./BuildState");
const ContentHasher_1 = require("./ContentHasher");
const DiskSpaceChecker_1 = require("../utils/DiskSpaceChecker");
const ProcessRunner_1 = require("../utils/ProcessRunner");
const ConfigurationManager_1 = require("../config/ConfigurationManager");
const GradleErrorDiagnoser_1 = require("./diagnostics/GradleErrorDiagnoser");
const Logger_1 = require("../utils/Logger");
class BuildManager {
    static instance;
    logger = Logger_1.Logger.getInstance();
    buildStateStore = BuildState_1.BuildStateStore.getInstance();
    constructor() { }
    static getInstance() {
        if (!BuildManager.instance) {
            BuildManager.instance = new BuildManager();
        }
        return BuildManager.instance;
    }
    async buildAndInstall(projectRoot, targetSerial, adbManager, options = {}) {
        const config = ConfigurationManager_1.ConfigurationManager.getInstance().getConfig();
        const flavor = options.flavor || config.buildFlavor || 'debug';
        const startTime = Date.now();
        // 1. Check disk space before starting build
        if (config.warnLowDiskSpace) {
            const diskInfo = await DiskSpaceChecker_1.DiskSpaceChecker.check(projectRoot, config.diskSpaceThresholdGb);
            if (diskInfo.isLow) {
                const choice = await vscode.window.showWarningMessage(`Low disk space warning: Only ${diskInfo.freeGb} GB free on target drive. Gradle builds typically require at least ${config.diskSpaceThresholdGb} GB. Continue anyway?`, 'Continue', 'Cancel');
                if (choice !== 'Continue') {
                    return {
                        success: false,
                        durationMs: Date.now() - startTime,
                        error: 'Build cancelled due to low disk space.'
                    };
                }
            }
        }
        // 2. Check BuildCache to see if build can be skipped
        if (!options.skipCache) {
            const cacheState = await BuildCache_1.BuildCache.getInstance().getBuildState(projectRoot);
            if (!cacheState.needsNativeBuild && !options.clean) {
                const existingApk = BuildDetector_1.BuildDetector.findApk(projectRoot, flavor);
                if (existingApk && existingApk.exists) {
                    this.logger.info(`Native build skipped! Content hash unchanged: ${cacheState.currentHash?.substring(0, 10)}. Using existing APK: ${existingApk.apkPath}`);
                    // Install existing APK
                    await adbManager.installApk(targetSerial, existingApk.apkPath, (msg) => {
                        this.logger.info(`[Install] ${msg.trim()}`);
                    });
                    return {
                        success: true,
                        skipped: true,
                        durationMs: Date.now() - startTime,
                        apkPath: existingApk.apkPath
                    };
                }
            }
        }
        // 3. Perform Gradle build
        const cancellationToken = this.buildStateStore.startBuild();
        try {
            const androidDir = path.join(projectRoot, 'android');
            const isWin = process.platform === 'win32';
            const gradlewName = isWin ? 'gradlew.bat' : 'gradlew';
            const gradlewPath = path.join(androidDir, gradlewName);
            // Capitalize flavor e.g. "debug" -> "Debug"
            const capitalizedFlavor = flavor.charAt(0).toUpperCase() + flavor.slice(1);
            const gradleTask = options.clean
                ? `clean assemble${capitalizedFlavor}`
                : `assemble${capitalizedFlavor}`;
            this.logger.info(`Starting Gradle build: ${gradlewName} ${gradleTask} in ${androidDir}`);
            this.logger.show(true);
            const gradleArgs = options.clean
                ? ['clean', `assemble${capitalizedFlavor}`]
                : [`assemble${capitalizedFlavor}`];
            const result = await ProcessRunner_1.ProcessRunner.run(gradlewPath, gradleArgs, {
                cwd: androidDir,
                cancellationToken,
                onStdout: (chunk) => {
                    this.logger.raw(chunk);
                    // Extract progress messages like "> Task :app:compileDebugJavaWithJavac"
                    const match = chunk.match(/> Task (:[^\s]+)/);
                    if (match) {
                        this.buildStateStore.updateProgress(match[1]);
                    }
                },
                onStderr: (chunk) => {
                    this.logger.raw(chunk);
                }
            });
            if (result.exitCode !== 0) {
                const combinedOutput = `${result.stdout}\n${result.stderr}`;
                const diagnosis = GradleErrorDiagnoser_1.GradleErrorDiagnoser.diagnose(combinedOutput);
                this.logger.error(`\n[DIAGNOSTIC REPORT] ${diagnosis.title}\n${diagnosis.details}`);
                vscode.window.showErrorMessage(`Build Failed: ${diagnosis.title}`, diagnosis.actionLabel || 'Show Output').then(selection => {
                    if (selection === diagnosis.actionLabel && diagnosis.actionDocUrl) {
                        vscode.env.openExternal(vscode.Uri.parse(diagnosis.actionDocUrl));
                    }
                    else if (selection === 'Open Run Diagnostics') {
                        vscode.commands.executeCommand('rn-diagnose');
                    }
                    else {
                        this.logger.show(true);
                    }
                });
                throw new Error(`${diagnosis.title}: ${diagnosis.details}`);
            }
            // 4. Locate generated APK
            const apkDetails = BuildDetector_1.BuildDetector.findApk(projectRoot, flavor);
            if (!apkDetails || !apkDetails.exists) {
                throw new Error(`Build finished with exit code 0, but no APK could be found for flavor "${flavor}".`);
            }
            this.logger.info(`Build successful! Generated APK: ${apkDetails.apkPath} (${Math.round((apkDetails.sizeBytes || 0) / (1024 * 1024))} MB)`);
            // 5. Update build cache with new content hash
            const { hash } = await ContentHasher_1.ContentHasher.calculateProjectNativeHash(projectRoot);
            await BuildCache_1.BuildCache.getInstance().saveSuccessfulBuild(projectRoot, hash, apkDetails.apkPath);
            // 6. Install to device
            this.buildStateStore.updateProgress('Installing APK on target device...');
            this.logger.info(`Installing APK to device ${targetSerial}...`);
            await adbManager.installApk(targetSerial, apkDetails.apkPath, (msg) => {
                this.logger.info(`[Install] ${msg.trim()}`);
            });
            const durationMs = Date.now() - startTime;
            this.logger.info(`APK installation completed in ${Math.round(durationMs / 1000)}s!`);
            return {
                success: true,
                durationMs,
                apkPath: apkDetails.apkPath
            };
        }
        catch (error) {
            this.logger.error(`Build or installation error: ${error.message}`);
            return {
                success: false,
                durationMs: Date.now() - startTime,
                error: error.message
            };
        }
        finally {
            this.buildStateStore.finishBuild();
        }
    }
}
exports.BuildManager = BuildManager;
//# sourceMappingURL=BuildManager.js.map