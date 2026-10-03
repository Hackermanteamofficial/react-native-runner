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
exports.ActionsTreeProvider = exports.ActionTreeItem = void 0;
const vscode = __importStar(require("vscode"));
class ActionTreeItem extends vscode.TreeItem {
    label;
    commandId;
    iconName;
    tooltipText;
    constructor(label, commandId, iconName, tooltipText) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.label = label;
        this.commandId = commandId;
        this.iconName = iconName;
        this.tooltipText = tooltipText;
        this.iconPath = new vscode.ThemeIcon(iconName);
        this.command = {
            title: label,
            command: commandId
        };
        this.tooltip = tooltipText || label;
        this.contextValue = 'actionItem';
    }
}
exports.ActionTreeItem = ActionTreeItem;
class ActionsTreeProvider {
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
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
        return [
            new ActionTreeItem('Run Application', 'rn-run', 'play', 'Run full build, metro, and launch pipeline (Ctrl+Shift+R)'),
            new ActionTreeItem('Attach Hermes Debugger', 'rn-debug', 'bug', 'Attach VS Code debugger to Hermes VM (Breakpoints & Inspection)'),
            new ActionTreeItem('Reload Application', 'rn-reload', 'refresh', 'Trigger fast reload (RR) on active device'),
            new ActionTreeItem('Open Dev Menu', 'rn-dev-menu', 'tools', 'Trigger React Native Dev Menu (Ctrl+M)'),
            new ActionTreeItem('Take Screenshot', 'rn-screenshot', 'camera', 'Capture device screen and save to .screenshots/'),
            new ActionTreeItem('Stream Logcat', 'rn-logcat', 'output', 'Stream real-time device logs with crash detection'),
            new ActionTreeItem('Open Deep Link...', 'rn-deep-link', 'link-external', 'Test custom schemes and deep links'),
            new ActionTreeItem('Switch Build Flavor', 'rn-select-flavor', 'symbol-module', 'Switch between debug, release, and product flavors'),
            new ActionTreeItem('Restart Metro (Clean Cache)', 'rn-metro-clean', 'clear-all', 'Purge bundler cache and restart Metro'),
            new ActionTreeItem('Free Port / Kill Process', 'rn-kill-port', 'flame', 'Inspect and terminate processes blocking Metro ports'),
            new ActionTreeItem('Clear App Data', 'rn-clear-data', 'trash', 'Clear application storage and cache via pm clear'),
            new ActionTreeItem('Uninstall App', 'rn-uninstall', 'close', 'Uninstall app and invalidate build cache'),
            new ActionTreeItem('Stop Runner / Processes', 'rn-stop', 'stop', 'Stop running build, Metro, or emulator'),
            new ActionTreeItem('System Diagnostics', 'rn-diagnose', 'heart', 'Inspect SDK, ADB, and system environment')
        ];
    }
}
exports.ActionsTreeProvider = ActionsTreeProvider;
//# sourceMappingURL=ActionsTreeProvider.js.map