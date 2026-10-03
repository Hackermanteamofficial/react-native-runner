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
exports.AndroidSdkDetector = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ConfigurationManager_1 = require("../config/ConfigurationManager");
const Logger_1 = require("./Logger");
class AndroidSdkDetector {
    static instance;
    logger = Logger_1.Logger.getInstance();
    constructor() { }
    static getInstance() {
        if (!AndroidSdkDetector.instance) {
            AndroidSdkDetector.instance = new AndroidSdkDetector();
        }
        return AndroidSdkDetector.instance;
    }
    normalizePath(p) {
        if (!p) {
            return '';
        }
        let normalized = path.resolve(p).replace(/\\/g, '/');
        if (process.platform === 'win32') {
            normalized = normalized.toLowerCase();
        }
        return normalized;
    }
    async detect(projectRoot) {
        const config = ConfigurationManager_1.ConfigurationManager.getInstance().getConfig();
        const sources = {};
        const warnings = [];
        const conflicts = [];
        // 1. VS Code settings
        if (config.androidSdkPath && fs.existsSync(config.androidSdkPath)) {
            sources['settings'] = config.androidSdkPath;
        }
        // 2. ANDROID_HOME
        const androidHome = process.env.ANDROID_HOME;
        if (androidHome && fs.existsSync(androidHome)) {
            sources['ANDROID_HOME'] = androidHome;
        }
        // 3. ANDROID_SDK_ROOT
        const androidSdkRoot = process.env.ANDROID_SDK_ROOT;
        if (androidSdkRoot && fs.existsSync(androidSdkRoot)) {
            sources['ANDROID_SDK_ROOT'] = androidSdkRoot;
        }
        // 4. local.properties in projectRoot/android/local.properties
        if (projectRoot) {
            const localPropsPath = path.join(projectRoot, 'android', 'local.properties');
            if (fs.existsSync(localPropsPath)) {
                try {
                    const content = fs.readFileSync(localPropsPath, 'utf8');
                    for (const line of content.split('\n')) {
                        const trimmed = line.trim();
                        if (trimmed.startsWith('sdk.dir=')) {
                            let sdkDir = trimmed.substring('sdk.dir='.length).trim();
                            // In local.properties on Windows, paths often have escaped backslashes (e.g. C\:\\Users)
                            sdkDir = sdkDir.replace(/\\:/g, ':').replace(/\\\\/g, '/').replace(/\\/g, '/');
                            if (fs.existsSync(sdkDir)) {
                                sources['local.properties'] = sdkDir;
                            }
                            break;
                        }
                    }
                }
                catch (e) {
                    this.logger.warn(`Failed to read local.properties: ${e}`);
                }
            }
        }
        // 5. Default OS search paths
        const defaultSdkPaths = this.getDefaultSdkPaths();
        for (const defaultPath of defaultSdkPaths) {
            if (fs.existsSync(defaultPath)) {
                sources['default'] = defaultPath;
                break;
            }
        }
        // Check for conflicts between defined sources
        const sourceKeys = Object.keys(sources);
        for (let i = 0; i < sourceKeys.length; i++) {
            for (let j = i + 1; j < sourceKeys.length; j++) {
                const keyA = sourceKeys[i];
                const keyB = sourceKeys[j];
                const pathA = sources[keyA];
                const pathB = sources[keyB];
                if (this.normalizePath(pathA) !== this.normalizePath(pathB)) {
                    const conflict = {
                        sourceA: keyA,
                        pathA,
                        sourceB: keyB,
                        pathB,
                        message: `SDK path mismatch: ${keyA} ("${pathA}") differs from ${keyB} ("${pathB}"). This can cause Gradle build discrepancies or ADB issues.`
                    };
                    conflicts.push(conflict);
                    warnings.push(conflict.message);
                }
            }
        }
        // Determine primary SDK path
        // Priority: Settings > local.properties > ANDROID_HOME > ANDROID_SDK_ROOT > Default
        const primarySdkPath = sources['settings'] ||
            sources['local.properties'] ||
            sources['ANDROID_HOME'] ||
            sources['ANDROID_SDK_ROOT'] ||
            sources['default'];
        if (!primarySdkPath) {
            warnings.push('Android SDK path could not be detected automatically. Please set ANDROID_HOME or configure rnDeviceRunner.androidSdkPath in settings.');
            return {
                isValid: false,
                sources,
                conflicts,
                warnings
            };
        }
        const isWin = process.platform === 'win32';
        const exeExt = isWin ? '.exe' : '';
        const cmdExt = isWin ? '.bat' : '';
        // 1. Resolve ADB
        let adbPath = config.adbPath;
        if (!adbPath || !fs.existsSync(adbPath)) {
            const candidateAdb = path.join(primarySdkPath, 'platform-tools', `adb${exeExt}`);
            if (fs.existsSync(candidateAdb)) {
                adbPath = candidateAdb;
            }
            else {
                // Check if in PATH
                adbPath = 'adb';
            }
        }
        // 2. Resolve Emulator
        let emulatorPath = config.emulatorPath;
        if (!emulatorPath || !fs.existsSync(emulatorPath)) {
            const candidateEmulator = path.join(primarySdkPath, 'emulator', `emulator${exeExt}`);
            if (fs.existsSync(candidateEmulator)) {
                emulatorPath = candidateEmulator;
            }
            else {
                emulatorPath = 'emulator';
            }
        }
        // 3. Resolve avdmanager
        let avdmanagerPath;
        const candidateCmdline = path.join(primarySdkPath, 'cmdline-tools', 'latest', 'bin', `avdmanager${cmdExt}`);
        const candidateLegacy = path.join(primarySdkPath, 'tools', 'bin', `avdmanager${cmdExt}`);
        if (fs.existsSync(candidateCmdline)) {
            avdmanagerPath = candidateCmdline;
        }
        else if (fs.existsSync(candidateLegacy)) {
            avdmanagerPath = candidateLegacy;
        }
        return {
            isValid: true,
            sdkPath: primarySdkPath,
            adbPath,
            emulatorPath,
            avdmanagerPath,
            sources,
            conflicts,
            warnings
        };
    }
    getDefaultSdkPaths() {
        const homeDir = process.env.HOME || process.env.USERPROFILE || '';
        const paths = [];
        if (process.platform === 'win32') {
            const localAppData = process.env.LOCALAPPDATA || path.join(homeDir, 'AppData', 'Local');
            paths.push(path.join(localAppData, 'Android', 'Sdk'));
            paths.push('C:\\Android\\Sdk');
            paths.push('D:\\Android\\Sdk');
        }
        else if (process.platform === 'darwin') {
            paths.push(path.join(homeDir, 'Library', 'Android', 'sdk'));
        }
        else {
            paths.push(path.join(homeDir, 'Android', 'Sdk'));
        }
        return paths;
    }
}
exports.AndroidSdkDetector = AndroidSdkDetector;
//# sourceMappingURL=AndroidSdkDetector.js.map