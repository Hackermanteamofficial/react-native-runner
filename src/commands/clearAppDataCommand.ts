import * as vscode from 'vscode';
import { ProjectDetector } from '../project/ProjectDetector';
import { DeviceManager } from '../devices/DeviceManager';
import { DeviceQuickPick } from '../ui/DeviceQuickPick';
import { Logger } from '../utils/Logger';

export async function clearAppDataCommand(): Promise<void> {
    const logger = Logger.getInstance();
    const deviceManager = DeviceManager.getInstance();
    const adbManager = deviceManager.getAdbManager();

    const project = await ProjectDetector.getInstance().detect();
    if (!project || !project.packageName) {
        vscode.window.showErrorMessage('No Android package name detected in current project.');
        return;
    }

    let device = deviceManager.getSelectedDevice();
    if (!device || device.state === 'offline' || !device.serial) {
        device = await DeviceQuickPick.show(deviceManager);
        if (!device || !device.serial) {
            return;
        }
    }

    try {
        await adbManager.clearAppData(device.serial, project.packageName);
        vscode.window.showInformationMessage(`Cleared app data and cache for "${project.packageName}" on ${device.name}.`);
        logger.info(`Successfully cleared storage for ${project.packageName} on ${device.serial}.`);
    } catch (e: any) {
        logger.error(`Failed to clear app data: ${e.message}`);
        vscode.window.showErrorMessage(`Failed to clear app data: ${e.message}`);
    }
}
