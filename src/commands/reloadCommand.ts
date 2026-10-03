import * as vscode from 'vscode';
import { DeviceManager } from '../devices/DeviceManager';
import { MetroManager } from '../metro/MetroManager';
import { ConfigurationManager } from '../config/ConfigurationManager';
import { Logger } from '../utils/Logger';

export async function reloadCommand(): Promise<void> {
    const deviceManager = DeviceManager.getInstance();
    const metroManager = MetroManager.getInstance();
    const adbManager = deviceManager.getAdbManager();
    const logger = Logger.getInstance();

    const selectedDevice = deviceManager.getSelectedDevice();
    const port = ConfigurationManager.getInstance().getConfig().metroPort;

    if (!selectedDevice || selectedDevice.state === 'offline' || !selectedDevice.serial) {
        vscode.window.showWarningMessage('No running device selected to reload.');
        return;
    }

    try {
        // Attempt fast reload via Metro endpoint first
        const reloadedViaMetro = await metroManager.triggerReload(port);

        if (!reloadedViaMetro) {
            // Fallback to sending keypress to device via ADB
            await adbManager.reloadReactNative(selectedDevice.serial);
        }

        vscode.window.setStatusBarMessage(`$(check) Reload triggered on ${selectedDevice.name}`, 3000);
        logger.info(`Reload command sent to ${selectedDevice.name} (${selectedDevice.serial}).`);
    } catch (e: any) {
        logger.error(`Failed to reload app: ${e.message}`);
        vscode.window.showErrorMessage(`Reload failed: ${e.message}`);
    }
}
