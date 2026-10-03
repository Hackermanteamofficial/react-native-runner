import * as vscode from 'vscode';
import { DeviceManager } from '../devices/DeviceManager';
import { Logger } from '../utils/Logger';

export async function devMenuCommand(): Promise<void> {
    const deviceManager = DeviceManager.getInstance();
    const adbManager = deviceManager.getAdbManager();
    const logger = Logger.getInstance();

    const selectedDevice = deviceManager.getSelectedDevice();
    if (!selectedDevice || selectedDevice.state === 'offline' || !selectedDevice.serial) {
        vscode.window.showWarningMessage('No active running device selected to open Dev Menu.');
        return;
    }

    try {
        await adbManager.sendDevMenuKeyEvent(selectedDevice.serial);
        vscode.window.setStatusBarMessage(`$(tools) Dev Menu sent to ${selectedDevice.name}`, 3000);
        logger.info(`Dev Menu (keyevent 82) sent to ${selectedDevice.name} (${selectedDevice.serial}).`);
    } catch (e: any) {
        logger.error(`Failed to send Dev Menu keyevent: ${e.message}`);
        vscode.window.showErrorMessage(`Failed to open Dev Menu: ${e.message}`);
    }
}
