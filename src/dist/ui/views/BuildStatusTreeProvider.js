"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildStatusTreeProvider = exports.BuildTreeItem = void 0;
const vscode = __importStar(require("vscode"));
const ProjectDetector_1 = require("../../project/ProjectDetector");
const BuildCache_1 = require("../../build/BuildCache");
const BuildState_1 = require("../../build/BuildState");
const NativeFileWatcher_1 = require("../../build/NativeFileWatcher");
const ConfigurationManager_1 = require("../../config/ConfigurationManager");
class BuildTreeItem extends vscode.TreeItem {
    label;
    descriptionText;
    iconName;
    commandId;
    constructor(label, descriptionText, iconName, commandId) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.label = label;
        this.descriptionText = descriptionText;
        this.iconName = iconName;
        this.commandId = commandId;
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
exports.BuildTreeItem = BuildTreeItem;
class BuildStatusTreeProvider {
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    constructor() {
        NativeFileWatcher_1.NativeFileWatcher.getInstance().on('buildStateChanged', () => this.refresh());
        BuildState_1.BuildStateStore.getInstance().on('buildStateChanged', () => this.refresh());
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
        if (element) {
            return [];
        }
        const project = await ProjectDetector_1.ProjectDetector.getInstance().detect();
        if (!project) {
            return [new BuildTreeItem('No React Native / Expo project detected', '', 'warning')];
        }
        const items = [];
        const config = ConfigurationManager_1.ConfigurationManager.getInstance().getConfig();
        // 1. Project Info
        const projType = project.isExpo ? (project.hasAndroid ? 'Expo Prebuild' : 'Expo Managed') : 'React Native Bare';
        items.push(new BuildTreeItem(`Project: ${project.name}`, projType, 'folder'));
        // 2. Build Status & Cache
        const cache = await BuildCache_1.BuildCache.getInstance().getBuildState(project.rootPath);
        const isBuilding = BuildState_1.BuildStateStore.getInstance().getIsBuilding();
        if (isBuilding) {
            items.push(new BuildTreeItem('Build Status', 'Compiling Gradle in progress...', 'sync~spin'));
        }
        else if (!project.hasAndroid) {
            items.push(new BuildTreeItem('Build Status', 'Expo Go (No native build needed)', 'check'));
        }
        else if (cache.needsNativeBuild) {
            items.push(new BuildTreeItem('Build Status', 'Native build needed (files changed)', 'tools'));
        }
        else {
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
exports.BuildStatusTreeProvider = BuildStatusTreeProvider;
//# sourceMappingURL=BuildStatusTreeProvider.js.map