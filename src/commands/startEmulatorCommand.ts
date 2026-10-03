import * as vscode from 'vscode';
import { DeviceManager } from '../devices/DeviceManager';
import { BootWaiter } from '../devices/BootWaiter';
import { Logger } from '../utils/Logger';

export async function startEmulatorCommand(): Promise<void> {
    const deviceManager = DeviceManager.getInstance();
    const avdManager = deviceManager.getAvdManager();
    const adbManager = deviceManager.getAdbManager();
    const logger = Logger.getInstance();

    const installedAvds = await avdManager.getInstalledAvds();
    if (installedAvds.length === 0) {
        vscode.window.showWarningMessage('No Android Virtual Devices (AVDs) found on this machine. Create one via Android Studio.');
        return;
    }

    const items = installedAvds.map(avd => ({
        label: `$(vm) ${avd.displayName}`,
        description: avd.name,
        avd
    }));

    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select an Android emulator to start:',
        title: 'Start Android Emulator'
    });

    if (!selected) {
        return;
    }

    try {
        await avdManager.startEmulator(selected.avd.name);

        vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `Booting emulator ${selected.avd.displayName}...`,
                cancellable: true
            },
            async (progress, token) => {
                const waiter = new BootWaiter(adbManager);

                // Emulators typically start as emulator-5554, emulator-5556, etc.
                // Wait briefly for ADB to list the serial
                let serial = '';
                for (let i = 0; i < 20; i++) {
                    if (token.isCancellationRequested) {
                        return;
                    }
                    await new Promise(r => setTimeout(r, 1000));
                    const devices = await adbManager.getDevicesDetailed();
                    const emu = devices.find(d => d.serial.startsWith('emulator-'));
                    if (emu) {
                        serial = emu.serial;
                        break;
                    }
                }

                if (!serial) {
                    vscode.window.showInformationMessage(`Emulator process spawned: ${selected.avd.name}`);
                    return;
                }

                const booted = await waiter.waitForBoot(serial, {
                    timeoutMs: 90000,
                    cancellationToken: token,
                    onProgress: (sec, msg) => {
                        progress.report({ message: `${msg} (${sec}s)` });
                    }
                });

                if (booted) {
                    await deviceManager.refreshDevices();
                    vscode.window.showInformationMessage(`Emulator ${selected.avd.displayName} (${serial}) is ready!`);
                }
            }
        );
    } catch (err: any) {
        logger.error(`Failed to start emulator: ${err.message}`);
        vscode.window.showErrorMessage(`Failed to start emulator: ${err.message}`);
    }
}
