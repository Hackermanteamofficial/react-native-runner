import * as vscode from 'vscode';
import { ProjectDetector } from '../project/ProjectDetector';
import { DeviceManager } from '../devices/DeviceManager';
import { DeviceQuickPick } from '../ui/DeviceQuickPick';
import { BootWaiter } from '../devices/BootWaiter';
import { BuildManager } from '../build/BuildManager';
import { MetroManager } from '../metro/MetroManager';
import { ExpoManager } from '../expo/ExpoManager';
import { ExpoCngManager } from '../expo/ExpoCngManager';
import { RunStateMachine } from '../state/RunStateMachine';
import { ConfigurationManager } from '../config/ConfigurationManager';
import { IosSimctlManager } from '../devices/ios/IosSimctlManager';
import { LogcatStreamer } from '../logging/LogcatStreamer';
import { Logger } from '../utils/Logger';

export async function runCommand(): Promise<void> {
    const logger = Logger.getInstance();
    const stateMachine = RunStateMachine.getInstance();
    const deviceManager = DeviceManager.getInstance();
    const adbManager = deviceManager.getAdbManager();
    const avdManager = deviceManager.getAvdManager();
    const buildManager = BuildManager.getInstance();
    const metroManager = MetroManager.getInstance();
    const expoManager = ExpoManager.getInstance();
    const config = ConfigurationManager.getInstance().getConfig();

    try {
        // 1. Detect active project
        stateMachine.transition({ type: 'START_RUN' });
        const project = await ProjectDetector.getInstance().detect();
        if (!project) {
            vscode.window.showErrorMessage('React Native Runner: No valid React Native or Expo project found.');
            stateMachine.transition({ type: 'FAIL', error: 'No project found' });
            return;
        }

        // Check Expo CNG Prebuild requirement
        const cngCheck = await ExpoCngManager.getInstance().checkAndPromptPrebuild(project);
        if (cngCheck === 'cancelled') {
            stateMachine.transition({ type: 'STOP' });
            return;
        }

        // 2. Resolve target device
        let device = deviceManager.getSelectedDevice();
        if (!device) {
            device = await DeviceQuickPick.show(deviceManager);
            if (!device) {
                stateMachine.transition({ type: 'STOP' });
                return;
            }
        }

        logger.info(`Run requested for project "${project.name}" on device "${device.name}" (${device.id})`);

        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `Running on ${device.name}...`,
                cancellable: true
            },
            async (progress, token) => {
                let targetSerial = device!.serial;

                // 3. Handle iOS Simulator if platform is iOS
                if (device!.platform === 'ios') {
                    if (device!.state === 'offline' && device!.simulatorId) {
                        progress.report({ message: `Booting iOS Simulator ${device!.name}...` });
                        await IosSimctlManager.getInstance().bootSimulator(device!.simulatorId);
                        device!.state = 'online';
                    }

                    const pods = IosSimctlManager.getInstance().checkCocoaPods(project.rootPath);
                    if (pods.needsPodInstall) {
                        vscode.window.showWarningMessage(pods.message!);
                    }

                    if (config.autoStartMetro) {
                        progress.report({ message: 'Checking Metro bundler...' });
                        await metroManager.ensureMetroRunning(project, config.metroPort);
                    }

                    if (project.appScheme && device!.simulatorId) {
                        await IosSimctlManager.getInstance().openUrl(device!.simulatorId, `${project.appScheme}://`);
                    }

                    stateMachine.transition({ type: 'APP_LAUNCHED' });
                    vscode.window.showInformationMessage(`React Native Runner: App running on ${device!.name}!`);
                    return;
                }

                // 4. If target is an offline emulator, start it and wait for boot
                if (device!.isEmulator && (device!.state === 'offline' || !targetSerial)) {
                    stateMachine.transition({ type: 'SELECT_DEVICE', device: device! });
                    progress.report({ message: `Starting emulator ${device!.name}...` });

                    await avdManager.startEmulator(device!.avdName || device!.name);

                    // Wait for emulator serial to appear in ADB
                    const waiter = new BootWaiter(adbManager);
                    for (let i = 0; i < 25; i++) {
                        if (token.isCancellationRequested) {
                            stateMachine.transition({ type: 'STOP' });
                            return;
                        }
                        await new Promise(r => setTimeout(r, 1000));
                        const rawDevices = await adbManager.getDevicesDetailed();
                        const emu = rawDevices.find(d => d.serial.startsWith('emulator-'));
                        if (emu) {
                            targetSerial = emu.serial;
                            break;
                        }
                    }

                    if (!targetSerial) {
                        throw new Error(`Emulator ${device!.name} was started, but no emulator serial appeared in ADB.`);
                    }

                    const booted = await waiter.waitForBoot(targetSerial, {
                        timeoutMs: 90000,
                        cancellationToken: token,
                        onProgress: (sec, msg) => {
                            progress.report({ message: `${msg} (${sec}s)` });
                        }
                    });

                    if (!booted) {
                        throw new Error(`Emulator ${device!.name} failed to boot.`);
                    }

                    // Refresh devices and update active device object
                    const refreshed = await deviceManager.refreshDevices();
                    const bootedDevice = refreshed.find(d => d.serial === targetSerial);
                    if (bootedDevice) {
                        device = bootedDevice;
                        await deviceManager.selectDevice(bootedDevice);
                    }

                    stateMachine.transition({ type: 'DEVICE_BOOTED', device: device! });
                }

                if (!targetSerial) {
                    throw new Error(`Target device ${device!.name} has no valid serial.`);
                }

                // 4. Native Build (if Android project exists)
                if (project.hasAndroid) {
                    progress.report({ message: 'Evaluating native build cache...' });
                    stateMachine.transition({ type: 'START_RUN', device: device! });

                    const buildResult = await buildManager.buildAndInstall(
                        project.rootPath,
                        targetSerial,
                        adbManager,
                        { flavor: config.buildFlavor }
                    );

                    if (!buildResult.success) {
                        stateMachine.transition({ type: 'BUILD_FAILURE', error: buildResult.error || 'Gradle build failed' });
                        throw new Error(buildResult.error || 'Gradle build failed');
                    }

                    if (buildResult.skipped) {
                        stateMachine.transition({ type: 'BUILD_SKIPPED' });
                    } else {
                        stateMachine.transition({ type: 'BUILD_SUCCESS', apkPath: buildResult.apkPath || '' });
                    }
                } else {
                    stateMachine.transition({ type: 'BUILD_SKIPPED' });
                }

                // 5. Ensure Metro Bundler Dev Server is running
                if (config.autoStartMetro) {
                    progress.report({ message: 'Checking Metro bundler...' });
                    const metroReady = await metroManager.ensureMetroRunning(project, config.metroPort);
                    if (metroReady) {
                        stateMachine.transition({ type: 'METRO_READY', port: config.metroPort });
                    }
                } else {
                    stateMachine.transition({ type: 'METRO_READY', port: config.metroPort });
                }

                // 6. Launch Application on Device
                progress.report({ message: 'Launching app on device...' });
                await expoManager.launchApp(project, targetSerial, adbManager, config.metroPort);

                stateMachine.transition({ type: 'APP_LAUNCHED' });
                vscode.window.showInformationMessage(`React Native Runner: App launched on ${device!.name}!`);

                // Automatically stream app Logcat
                LogcatStreamer.getInstance().start(targetSerial, device!.name, project.packageName).catch(err => {
                    logger.warn(`Failed to auto-start Logcat: ${err}`);
                });
            }
        );
    } catch (err: any) {
        logger.error(`Run pipeline encountered an error: ${err.message}`);
        stateMachine.transition({ type: 'FAIL', error: err.message });
        vscode.window.showErrorMessage(`React Native Runner: ${err.message}`);
    }
}
