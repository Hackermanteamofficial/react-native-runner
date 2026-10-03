import * as vscode from 'vscode';
import { ProjectDetector } from '../project/ProjectDetector';
import { MetroManager } from '../metro/MetroManager';
import { ConfigurationManager } from '../config/ConfigurationManager';
import { Logger } from '../utils/Logger';

export async function cleanMetroCommand(): Promise<void> {
    const logger = Logger.getInstance();
    const metroManager = MetroManager.getInstance();
    const config = ConfigurationManager.getInstance().getConfig();

    const project = await ProjectDetector.getInstance().detect();
    if (!project) {
        vscode.window.showErrorMessage('No React Native or Expo project found.');
        return;
    }

    try {
        metroManager.restartWithCleanCache(project, config.metroPort);
        vscode.window.setStatusBarMessage('$(clear-all) Metro restarting with clean cache...', 4000);
        logger.info(`Metro Bundler restarted with clean cache on port ${config.metroPort}.`);
    } catch (e: any) {
        logger.error(`Failed to restart Metro: ${e.message}`);
        vscode.window.showErrorMessage(`Metro restart failed: ${e.message}`);
    }
}
