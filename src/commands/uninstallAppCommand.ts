import * as vscode from 'vscode';
import { ProjectDetector } from '../project/ProjectDetector';
import { DeviceManager } from '../devices/DeviceManager';
import { DeviceQuickPick } from '../ui/DeviceQuickPick';
import { BuildCache } from '../build/BuildCache';
import { Logger } from '../utils/Logger';

export async function uninstallAppCommand(): Promise<void> {
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

    const confirm = await vscode.window.showWarningMessage(
        `Are you sure you want to uninstall "${project.packageName}" from ${device.name}?`,
        { modal: true },
        'Uninstall'
    );

    if (confirm !== 'Uninstall') {
        return;
    }

    try {
        await adbManager.uninstallApp(device.serial, project.packageName);
        await BuildCache.getInstance().invalidate(project.rootPath);
        vscode.window.showInformationMessage(`Uninstalled "${project.packageName}" from ${device.name}.`);
        logger.info(`Successfully uninstalled ${project.packageName} from ${device.serial}.`);
    } catch (e: any) {
        logger.error(`Failed to uninstall app: ${e.message}`);
        vscode.window.showErrorMessage(`Failed to uninstall app: ${e.message}`);
    }
}
