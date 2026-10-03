import * as path from 'path';
import * as vscode from 'vscode';
import { BuildCache } from './BuildCache';
import { BuildDetector } from './BuildDetector';
import { BuildStateStore } from './BuildState';
import { ContentHasher } from './ContentHasher';
import { DiskSpaceChecker } from '../utils/DiskSpaceChecker';
import { ProcessRunner } from '../utils/ProcessRunner';
import { ConfigurationManager } from '../config/ConfigurationManager';
import { AdbManager } from '../devices/AdbManager';
import { BuildOptions, BuildResult } from '../types/Build';
import { GradleErrorDiagnoser } from './diagnostics/GradleErrorDiagnoser';
import { Logger } from '../utils/Logger';

export class BuildManager {
    private static instance: BuildManager;
    private logger = Logger.getInstance();
    private buildStateStore = BuildStateStore.getInstance();

    private constructor() {}

    public static getInstance(): BuildManager {
        if (!BuildManager.instance) {
            BuildManager.instance = new BuildManager();
        }
        return BuildManager.instance;
    }

    public async buildAndInstall(
        projectRoot: string,
        targetSerial: string,
        adbManager: AdbManager,
        options: BuildOptions = {}
    ): Promise<BuildResult> {
        const config = ConfigurationManager.getInstance().getConfig();
        const flavor = options.flavor || config.buildFlavor || 'debug';
        const startTime = Date.now();

        // 1. Check disk space before starting build
        if (config.warnLowDiskSpace) {
            const diskInfo = await DiskSpaceChecker.check(projectRoot, config.diskSpaceThresholdGb);
            if (diskInfo.isLow) {
                const choice = await vscode.window.showWarningMessage(
                    `Low disk space warning: Only ${diskInfo.freeGb} GB free on target drive. Gradle builds typically require at least ${config.diskSpaceThresholdGb} GB. Continue anyway?`,
                    'Continue',
                    'Cancel'
                );
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
            const cacheState = await BuildCache.getInstance().getBuildState(projectRoot);
            if (!cacheState.needsNativeBuild && !options.clean) {
                const existingApk = BuildDetector.findApk(projectRoot, flavor);
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

            const result = await ProcessRunner.run(
                gradlewPath,
                gradleArgs,
                {
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
                }
            );

            if (result.exitCode !== 0) {
                const combinedOutput = `${result.stdout}\n${result.stderr}`;
                const diagnosis = GradleErrorDiagnoser.diagnose(combinedOutput);
                this.logger.error(`\n[DIAGNOSTIC REPORT] ${diagnosis.title}\n${diagnosis.details}`);

                vscode.window.showErrorMessage(
                    `Build Failed: ${diagnosis.title}`,
                    diagnosis.actionLabel || 'Show Output'
                ).then(selection => {
                    if (selection === diagnosis.actionLabel && diagnosis.actionDocUrl) {
                        vscode.env.openExternal(vscode.Uri.parse(diagnosis.actionDocUrl));
                    } else if (selection === 'Open Run Diagnostics') {
                        vscode.commands.executeCommand('rn-diagnose');
                    } else {
                        this.logger.show(true);
                    }
                });

                throw new Error(`${diagnosis.title}: ${diagnosis.details}`);
            }

            // 4. Locate generated APK
            const apkDetails = BuildDetector.findApk(projectRoot, flavor);
            if (!apkDetails || !apkDetails.exists) {
                throw new Error(`Build finished with exit code 0, but no APK could be found for flavor "${flavor}".`);
            }

            this.logger.info(`Build successful! Generated APK: ${apkDetails.apkPath} (${Math.round((apkDetails.sizeBytes || 0) / (1024 * 1024))} MB)`);

            // 5. Update build cache with new content hash
            const { hash } = await ContentHasher.calculateProjectNativeHash(projectRoot);
            await BuildCache.getInstance().saveSuccessfulBuild(projectRoot, hash, apkDetails.apkPath);

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
        } catch (error: any) {
            this.logger.error(`Build or installation error: ${error.message}`);
            return {
                success: false,
                durationMs: Date.now() - startTime,
                error: error.message
            };
        } finally {
            this.buildStateStore.finishBuild();
        }
    }
}
