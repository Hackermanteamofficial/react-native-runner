import * as vscode from 'vscode';
import { AndroidSdkDetector } from '../utils/AndroidSdkDetector';
import { DiskSpaceChecker } from '../utils/DiskSpaceChecker';
import { ProjectDetector } from '../project/ProjectDetector';
import { DeviceManager } from '../devices/DeviceManager';
import { ProcessRunner } from '../utils/ProcessRunner';
import { Logger } from '../utils/Logger';

export async function diagnoseCommand(): Promise<void> {
    const logger = Logger.getInstance();
    logger.show();
    logger.clear();

    logger.info('=====================================================');
    logger.info('   REACT NATIVE RUNNER: SYSTEM DIAGNOSTIC REPORT     ');
    logger.info('=====================================================');

    // 1. Project Detection
    logger.info('\n--- [1] Workspace & Project Info ---');
    const project = await ProjectDetector.getInstance().detect(true);
    if (project) {
        logger.info(`Name:             ${project.name}`);
        logger.info(`Root:             ${project.rootPath}`);
        logger.info(`Architecture:     ${project.type}`);
        logger.info(`Expo:             ${project.isExpo ? 'Yes' : 'No'}`);
        logger.info(`Expo Dev Client:  ${project.isExpoDevClient ? 'Yes' : 'No'}`);
        logger.info(`Android Dir:      ${project.hasAndroid ? project.androidPath : 'None'}`);
        logger.info(`Package Name:     ${project.packageName || 'Not detected'}`);
        logger.info(`App Scheme:       ${project.appScheme || 'None'}`);
    } else {
        logger.warn('No active React Native or Expo workspace found.');
    }

    // 2. Android SDK & Environment
    logger.info('\n--- [2] Android SDK Detection & Health ---');
    const sdkInfo = await AndroidSdkDetector.getInstance().detect(project?.rootPath);
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
    } else {
        logger.info('No SDK path conflicts detected.');
    }

    // 3. ADB Version Check
    logger.info('\n--- [3] ADB & Tools Version ---');
    if (sdkInfo.adbPath) {
        try {
            const adbVer = await ProcessRunner.run(sdkInfo.adbPath, ['version'], { timeoutMs: 4000 });
            logger.info(`ADB Output:\n${adbVer.stdout.trim()}`);
        } catch (e: any) {
            logger.error(`ADB execution failed: ${e.message}`);
        }
    }

    // 4. Devices & Emulators
    logger.info('\n--- [4] Devices & AVDs ---');
    const deviceManager = DeviceManager.getInstance();
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
        const disk = await DiskSpaceChecker.check(project.rootPath);
        logger.info(`Project Drive Free Space: ${disk.freeGb} GB / ${disk.totalGb} GB (Threshold: ${disk.thresholdGb} GB)`);
        if (disk.isLow) {
            logger.warn('⚠️  Warning: Low disk space may cause Gradle build failure!');
        } else {
            logger.info('Disk space is adequate for Gradle builds.');
        }
    }

    logger.info('\n=====================================================');
    logger.info('Diagnostic complete. Check any warnings above.');
    logger.info('=====================================================');

    vscode.window.showInformationMessage('React Native Runner diagnostic report generated in Output channel.');
}
