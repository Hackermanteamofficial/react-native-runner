import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { ProjectInfo } from '../types/Project';
import { Logger } from '../utils/Logger';

export class ExpoCngManager {
    private static instance: ExpoCngManager;
    private logger = Logger.getInstance();

    private constructor() {}

    public static getInstance(): ExpoCngManager {
        if (!ExpoCngManager.instance) {
            ExpoCngManager.instance = new ExpoCngManager();
        }
        return ExpoCngManager.instance;
    }

    public async checkAndPromptPrebuild(project: ProjectInfo): Promise<'proceed' | 'cancelled'> {
        // If android folder already exists, prebuild is already done
        if (project.hasAndroid) {
            return 'proceed';
        }

        // If not an Expo project, no CNG check needed
        if (!project.isExpo) {
            return 'proceed';
        }

        const packageJsonPath = path.join(project.rootPath, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
            return 'proceed';
        }

        try {
            const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
            const deps = { ...pkg.dependencies, ...pkg.devDependencies };

            // Scan for dependencies that indicate native code requiring development builds
            const hasCustomNativeModules = Object.keys(deps).some(dep => 
                (dep.startsWith('react-native-') && !dep.includes('web') && !dep.includes('safe-area-context') && !dep.includes('screens')) ||
                dep.startsWith('@react-native-') ||
                dep.startsWith('@stripe/') ||
                dep.includes('vision-camera') ||
                dep.includes('google-signin') ||
                dep.includes('firebase')
            );

            if (hasCustomNativeModules) {
                const choice = await vscode.window.showWarningMessage(
                    `This Expo project contains native libraries that require a Development Build (expo-dev-client). The 'android/' directory is missing.`,
                    'Run Expo Prebuild',
                    'Continue with Expo Go anyway',
                    'Cancel'
                );

                if (choice === 'Run Expo Prebuild') {
                    this.logger.info('Running "npx expo prebuild --platform android"...');
                    const terminal = vscode.window.createTerminal({
                        name: 'Expo Prebuild',
                        cwd: project.rootPath
                    });
                    terminal.show(true);
                    terminal.sendText('npx expo prebuild --platform android');
                    vscode.window.showInformationMessage('Expo prebuild started in terminal. Re-run after prebuild completes.');
                    return 'cancelled';
                } else if (choice === 'Cancel' || !choice) {
                    return 'cancelled';
                }
            }
        } catch (e) {
            this.logger.warn(`Could not parse package.json for CNG check: ${e}`);
        }

        return 'proceed';
    }
}
