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
exports.diagnoseCommand = diagnoseCommand;
const vscode = __importStar(require("vscode"));
const AndroidSdkDetector_1 = require("../utils/AndroidSdkDetector");
const DiskSpaceChecker_1 = require("../utils/DiskSpaceChecker");
const ProjectDetector_1 = require("../project/ProjectDetector");
const DeviceManager_1 = require("../devices/DeviceManager");
const ProcessRunner_1 = require("../utils/ProcessRunner");
const Logger_1 = require("../utils/Logger");
async function diagnoseCommand() {
    const logger = Logger_1.Logger.getInstance();
    logger.show();
    logger.clear();
    logger.info('=====================================================');
    logger.info('   RN DEVICE RUNNER: SYSTEM DIAGNOSTIC REPORT        ');
    logger.info('=====================================================');
    // 1. Project Detection
    logger.info('\n--- [1] Workspace & Project Info ---');
    const project = await ProjectDetector_1.ProjectDetector.getInstance().detect(true);
    if (project) {
        logger.info(`Name:             ${project.name}`);
        logger.info(`Root:             ${project.rootPath}`);
        logger.info(`Architecture:     ${project.type}`);
        logger.info(`Expo:             ${project.isExpo ? 'Yes' : 'No'}`);
        logger.info(`Expo Dev Client:  ${project.isExpoDevClient ? 'Yes' : 'No'}`);
        logger.info(`Android Dir:      ${project.hasAndroid ? project.androidPath : 'None'}`);
        logger.info(`Package Name:     ${project.packageName || 'Not detected'}`);
        logger.info(`App Scheme:       ${project.appScheme || 'None'}`);
    }
    else {
        logger.warn('No active React Native or Expo workspace found.');
    }
    // 2. Android SDK & Environment
    logger.info('\n--- [2] Android SDK Detection & Health ---');
    const sdkInfo = await AndroidSdkDetector_1.AndroidSdkDetector.getInstance().detect(project?.rootPath);
    logger.info(`SDK Valid:        ${sdkInfo.isValid ? 'YES' : 'NO'}`);
    logger.info(`Resolved SDK:     ${sdkInfo.sdkPath || 'None'}`);
    logger.info(`ADB Path:         ${sdkInfo.adbPath || 'None'}`);
    logger.info(`Emulator Path:    ${sdkInfo.emulatorPath || 'None'}`);
    logger.info('Sources detected:');
    for (const [src, path] of Object.entries(sdkInfo.sources)) {
        logger.info(`  • ${src}: ${path}`);
    }
    if (sdkInfo.conflicts.length > 0) {
        logger.warn(`\n⚠️  WARNING: ${sdkInfo.conflicts.length} SDK Path Conflict(s) Detected!`);
        for (const conflict of sdkInfo.conflicts) {
            logger.warn(`  • ${conflict.message}`);
        }
    }
    else {
        logger.info('No SDK path conflicts detected.');
    }
    // 3. ADB Version Check
    logger.info('\n--- [3] ADB & Tools Version ---');
    if (sdkInfo.adbPath) {
        try {
            const adbVer = await ProcessRunner_1.ProcessRunner.run(sdkInfo.adbPath, ['version'], { timeoutMs: 4000 });
            logger.info(`ADB Output:\n${adbVer.stdout.trim()}`);
        }
        catch (e) {
            logger.error(`ADB execution failed: ${e.message}`);
        }
    }
    // 4. Devices & Emulators
    logger.info('\n--- [4] Devices & AVDs ---');
    const deviceManager = DeviceManager_1.DeviceManager.getInstance();
    const devices = await deviceManager.refreshDevices();
    logger.info(`Total Devices Discovered: ${devices.length}`);
    for (const d of devices) {
        const type = d.isEmulator ? 'EMULATOR' : 'PHYSICAL';
        const conn = d.connection ? `(${d.connection.toUpperCase()})` : '';
        logger.info(`  • [${d.state.toUpperCase()}] ${d.name} (${type} ${conn}) [ID: ${d.id}]`);
    }
    // 5. Disk Space
    logger.info('\n--- [5] Disk Space Check ---');
    if (project) {
        const disk = await DiskSpaceChecker_1.DiskSpaceChecker.check(project.rootPath);
        logger.info(`Project Drive Free Space: ${disk.freeGb} GB / ${disk.totalGb} GB (Threshold: ${disk.thresholdGb} GB)`);
        if (disk.isLow) {
            logger.warn('⚠️  Warning: Low disk space may cause Gradle build failure!');
        }
        else {
            logger.info('Disk space is adequate for Gradle builds.');
        }
    }
    logger.info('\n=====================================================');
    logger.info('Diagnostic complete. Check any warnings above.');
    logger.info('=====================================================');
    vscode.window.showInformationMessage('RN Device Runner diagnostic report generated in Output channel.');
}
//# sourceMappingURL=diagnoseCommand.js.map