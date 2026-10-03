import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { Logger } from '../utils/Logger';

export interface WorkspaceProjectFolder {
    uri: vscode.Uri;
    name: string;
    packageJsonPath: string;
    hasReactNative: boolean;
    hasExpo: boolean;
}

export class WorkspaceResolver {
    private static instance: WorkspaceResolver;
    private selectedFolder: WorkspaceProjectFolder | undefined;
    private logger = Logger.getInstance();

    private constructor() {}

    public static getInstance(): WorkspaceResolver {
        if (!WorkspaceResolver.instance) {
            WorkspaceResolver.instance = new WorkspaceResolver();
        }
        return WorkspaceResolver.instance;
    }

    public getSelectedFolder(): WorkspaceProjectFolder | undefined {
        return this.selectedFolder;
    }

    public setSelectedFolder(folder: WorkspaceProjectFolder): void {
        this.selectedFolder = folder;
        this.logger.info(`Active project workspace set to: ${folder.name} (${folder.uri.fsPath})`);
    }

    public async resolveWorkspaceFolder(promptIfMultiple: boolean = false): Promise<WorkspaceProjectFolder | undefined> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            this.logger.warn('No workspace folders open in VS Code.');
            return undefined;
        }

        const candidateFolders: WorkspaceProjectFolder[] = [];

        for (const folder of workspaceFolders) {
            const pkgPath = path.join(folder.uri.fsPath, 'package.json');
            if (fs.existsSync(pkgPath)) {
                try {
                    const content = fs.readFileSync(pkgPath, 'utf8');
                    const json = JSON.parse(content);
                    const deps = { ...(json.dependencies || {}), ...(json.devDependencies || {}) };
                    const hasReactNative = !!deps['react-native'];
                    const hasExpo = !!deps['expo'];

                    if (hasReactNative || hasExpo) {
                        candidateFolders.push({
                            uri: folder.uri,
                            name: json.name || folder.name,
                            packageJsonPath: pkgPath,
                            hasReactNative,
                            hasExpo
                        });
                    }
                } catch (e) {
                    this.logger.warn(`Could not parse package.json in ${folder.uri.fsPath}: ${e}`);
                }
            }
        }

        if (candidateFolders.length === 0) {
            this.logger.warn('No React Native or Expo projects found in open workspace folders.');
            // Fallback to first folder if available
            const first = workspaceFolders[0];
            return {
                uri: first.uri,
                name: first.name,
                packageJsonPath: path.join(first.uri.fsPath, 'package.json'),
                hasReactNative: false,
                hasExpo: false
            };
        }

        if (candidateFolders.length === 1) {
            this.selectedFolder = candidateFolders[0];
            return this.selectedFolder;
        }

        // If previously selected and still in candidates, and prompt not explicitly requested
        if (this.selectedFolder && !promptIfMultiple) {
            const stillExists = candidateFolders.find(c => c.uri.fsPath === this.selectedFolder!.uri.fsPath);
            if (stillExists) {
                return this.selectedFolder;
            }
        }

        // Multiple candidates: ask user
        const items = candidateFolders.map(c => ({
            label: `$(folder) ${c.name}`,
            description: c.uri.fsPath,
            detail: `${c.hasExpo ? 'Expo' : ''} ${c.hasReactNative ? 'React Native' : ''}`.trim(),
            folder: c
        }));

        const chosen = await vscode.window.showQuickPick(items, {
            placeHolder: 'Multiple React Native projects detected. Select the active project:',
            title: 'React Native Runner: Select Workspace Project'
        });

        if (chosen) {
            this.selectedFolder = chosen.folder;
            return this.selectedFolder;
        }

        return candidateFolders[0];
    }
}
