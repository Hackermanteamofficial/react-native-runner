import * as vscode from 'vscode';

export class ActionTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly commandId: string,
        public readonly iconName: string,
        public readonly tooltipText?: string
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.iconPath = new vscode.ThemeIcon(iconName);
        this.command = {
            title: label,
            command: commandId
        };
        this.tooltip = tooltipText || label;
        this.contextValue = 'actionItem';
    }
}

export class ActionsTreeProvider implements vscode.TreeDataProvider<ActionTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ActionTreeItem | undefined | null | void> = new vscode.EventEmitter<ActionTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ActionTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    public refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    public getTreeItem(element: ActionTreeItem): vscode.TreeItem {
        return element;
    }

    public async getChildren(element?: ActionTreeItem): Promise<ActionTreeItem[]> {
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
