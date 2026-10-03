import * as vscode from 'vscode';
import { ProjectDetector } from '../../project/ProjectDetector';
import { BuildCache } from '../../build/BuildCache';
import { BuildStateStore } from '../../build/BuildState';
import { NativeFileWatcher } from '../../build/NativeFileWatcher';
import { ConfigurationManager } from '../../config/ConfigurationManager';

export class BuildTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly descriptionText?: string,
        public readonly iconName?: string,
        public readonly commandId?: string
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
        if (descriptionText) {
            this.description = descriptionText;
        }
        if (iconName) {
            this.iconPath = new vscode.ThemeIcon(iconName);
        }
        if (commandId) {
            this.command = {
                title: label,
                command: commandId
            };
        }
    }
}

export class BuildStatusTreeProvider implements vscode.TreeDataProvider<BuildTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<BuildTreeItem | undefined | null | void> = new vscode.EventEmitter<BuildTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<BuildTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor() {
        NativeFileWatcher.getInstance().on('buildStateChanged', () => this.refresh());
        BuildStateStore.getInstance().on('buildStateChanged', () => this.refresh());
    }

    public refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    public getTreeItem(element: BuildTreeItem): vscode.TreeItem {
        return element;
    }

    public async getChildren(element?: BuildTreeItem): Promise<BuildTreeItem[]> {
        if (element) {
            return [];
        }

        const project = await ProjectDetector.getInstance().detect();
        if (!project) {
            return [new BuildTreeItem('No React Native / Expo project detected', '', 'warning')];
        }

        const items: BuildTreeItem[] = [];
        const config = ConfigurationManager.getInstance().getConfig();

        // 1. Project Info
        const projType = project.isExpo ? (project.hasAndroid ? 'Expo Prebuild' : 'Expo Managed') : 'React Native Bare';
        items.push(new BuildTreeItem(`Project: ${project.name}`, projType, 'folder'));

        // 2. Build Status & Cache
        const cache = await BuildCache.getInstance().getBuildState(project.rootPath);
        const isBuilding = BuildStateStore.getInstance().getIsBuilding();

        if (isBuilding) {
            items.push(new BuildTreeItem('Build Status', 'Compiling Gradle in progress...', 'sync~spin'));
        } else if (!project.hasAndroid) {
            items.push(new BuildTreeItem('Build Status', 'Expo Go (No native build needed)', 'check'));
        } else if (cache.needsNativeBuild) {
            items.push(new BuildTreeItem('Build Status', 'Native build needed (files changed)', 'tools'));
        } else {
            items.push(new BuildTreeItem('Build Status', 'Up-to-date (Cached)', 'check'));
        }

        if (cache.currentHash) {
            items.push(new BuildTreeItem('Content Hash', cache.currentHash.substring(0, 10), 'symbol-key'));
        }

        items.push(new BuildTreeItem('Build Flavor', `${config.buildFlavor || 'debug'} (Click to change)`, 'gear', 'rn-select-flavor'));

        // 3. Actions
        items.push(new BuildTreeItem('Rebuild Native App (Clean)', '', 'run-all', 'react-native-runner.rebuildClean'));
        items.push(new BuildTreeItem('Invalidate Build Cache', '', 'trash', 'react-native-runner.invalidateCache'));

        return items;
    }
}
