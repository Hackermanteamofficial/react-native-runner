import * as vscode from 'vscode';
import { ProjectDetector } from '../project/ProjectDetector';
import { DeviceManager } from '../devices/DeviceManager';
import { DeviceQuickPick } from '../ui/DeviceQuickPick';
import { Logger } from '../utils/Logger';

export async function deepLinkCommand(): Promise<void> {
    const logger = Logger.getInstance();
    const deviceManager = DeviceManager.getInstance();
    const adbManager = deviceManager.getAdbManager();

    let device = deviceManager.getSelectedDevice();
    if (!device || device.state === 'offline' || !device.serial) {
        device = await DeviceQuickPick.show(deviceManager);
        if (!device || !device.serial) {
            return;
        }
    }

    const project = await ProjectDetector.getInstance().detect();
    const defaultPlaceholder = project?.appScheme ? `${project.appScheme}://` : 'myapp://';

    const url = await vscode.window.showInputBox({
        title: 'React Native Runner: Open Deep Link',
        prompt: 'Enter custom scheme or universal deep link URL:',
        value: defaultPlaceholder,
        valueSelection: [defaultPlaceholder.length, defaultPlaceholder.length]
    });

    if (!url || url.trim().length === 0) {
        return;
    }

    try {
        await adbManager.startActivityUri(device.serial, url.trim());
        vscode.window.setStatusBarMessage(`$(link-external) Deep link launched: ${url}`, 3000);
        logger.info(`Opened deep link "${url}" on ${device.name} (${device.serial}).`);
    } catch (e: any) {
        logger.error(`Failed to launch deep link: ${e.message}`);
        vscode.window.showErrorMessage(`Deep link failed: ${e.message}`);
    }
}
