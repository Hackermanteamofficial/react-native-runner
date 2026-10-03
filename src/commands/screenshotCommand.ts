import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { DeviceManager } from '../devices/DeviceManager';
import { DeviceQuickPick } from '../ui/DeviceQuickPick';
import { ProjectDetector } from '../project/ProjectDetector';
import { Logger } from '../utils/Logger';

export async function screenshotCommand(): Promise<void> {
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
    const rootPath = project?.rootPath || (vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : process.cwd());
    const screenshotsDir = path.join(rootPath, '.screenshots');

    if (!fs.existsSync(screenshotsDir)) {
        try {
            fs.mkdirSync(screenshotsDir, { recursive: true });
        } catch (err: any) {
            vscode.window.showErrorMessage(`Failed to create screenshots folder: ${err.message}`);
            return;
        }
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `screenshot_${timestamp}.png`;
    const targetPath = path.join(screenshotsDir, filename);

    try {
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `Capturing screenshot from ${device.name}...`
            },
            async () => {
                await adbManager.takeScreenshot(device!.serial!, targetPath);
            }
        );

        vscode.window.showInformationMessage(
            `Screenshot saved: ${filename}`,
            'Open Image',
            'Reveal in File Explorer'
        ).then(choice => {
            if (choice === 'Open Image') {
                vscode.commands.executeCommand('vscode.open', vscode.Uri.file(targetPath));
            } else if (choice === 'Reveal in File Explorer') {
                vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(targetPath));
            }
        });
    } catch (e: any) {
        logger.error(`Screenshot failed: ${e.message}`);
        vscode.window.showErrorMessage(`Failed to capture screenshot: ${e.message}`);
    }
}
