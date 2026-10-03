import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { ProjectDetector } from '../project/ProjectDetector';
import { ConfigurationManager } from '../config/ConfigurationManager';
import { BuildCache } from '../build/BuildCache';
import { Logger } from '../utils/Logger';

export async function selectFlavorCommand(): Promise<void> {
    const logger = Logger.getInstance();
    const config = ConfigurationManager.getInstance().getConfig();
    const currentFlavor = config.buildFlavor || 'debug';

    const project = await ProjectDetector.getInstance().detect();
    const flavorOptions: { label: string; description?: string; flavor: string }[] = [
        { label: '$(gear) debug', description: currentFlavor === 'debug' ? '(Active)' : 'Standard debug build', flavor: 'debug' },
        { label: '$(package) release', description: currentFlavor === 'release' ? '(Active)' : 'Optimized production build', flavor: 'release' }
    ];

    // Detect product flavors in android/app/build.gradle if available
    if (project?.hasAndroid) {
        const buildGradlePath = path.join(project.rootPath, 'android', 'app', 'build.gradle');
        if (fs.existsSync(buildGradlePath)) {
            try {
                const content = fs.readFileSync(buildGradlePath, 'utf-8');
                const flavorMatch = content.match(/flavorDimensions[^{]*productFlavors\s*\{([^}]+)\}/s);
                if (flavorMatch && flavorMatch[1]) {
                    const block = flavorMatch[1];
                    const detectedFlavors = block.match(/^\s*([a-zA-Z0-9_]+)\s*\{/gm);
                    if (detectedFlavors) {
                        for (const raw of detectedFlavors) {
                            const name = raw.replace(/[\s{]/g, '');
                            if (name && !['flavorDimensions', 'create'].includes(name)) {
                                flavorOptions.push({
                                    label: `$(symbol-module) ${name}Debug`,
                                    description: currentFlavor === `${name}Debug` ? '(Active)' : 'Debug flavor',
                                    flavor: `${name}Debug`
                                });
                                flavorOptions.push({
                                    label: `$(symbol-module) ${name}Release`,
                                    description: currentFlavor === `${name}Release` ? '(Active)' : 'Release flavor',
                                    flavor: `${name}Release`
                                });
                            }
                        }
                    }
                }
            } catch (e) {
                logger.debug(`Could not inspect product flavors in build.gradle: ${e}`);
            }
        }
    }

    flavorOptions.push({
        label: '$(edit) Custom Flavor...',
        description: 'Enter a custom Gradle build flavor or task name',
        flavor: '__CUSTOM__'
    });

    const choice = await vscode.window.showQuickPick(flavorOptions, {
        title: 'React Native Runner: Select Android Build Flavor',
        placeHolder: `Current Flavor: ${currentFlavor}`
    });

    if (!choice) {
        return;
    }

    let targetFlavor = choice.flavor;
    if (targetFlavor === '__CUSTOM__') {
        const input = await vscode.window.showInputBox({
            title: 'Enter Custom Build Flavor',
            prompt: 'Gradle build variant (e.g. stagingDebug, devRelease):',
            value: currentFlavor
        });
        if (!input || !input.trim()) {
            return;
        }
        targetFlavor = input.trim();
    }

    if (targetFlavor === currentFlavor) {
        return;
    }

    try {
        await vscode.workspace.getConfiguration('rnDeviceRunner').update('buildFlavor', targetFlavor, vscode.ConfigurationTarget.Workspace);
        if (project) {
            await BuildCache.getInstance().invalidate(project.rootPath);
        }
        vscode.window.showInformationMessage(`Build flavor switched to: "${targetFlavor}". Build cache refreshed.`);
        logger.info(`Active build flavor changed to "${targetFlavor}".`);
    } catch (e: any) {
        logger.error(`Failed to update build flavor: ${e.message}`);
        vscode.window.showErrorMessage(`Failed to update build flavor: ${e.message}`);
    }
}
