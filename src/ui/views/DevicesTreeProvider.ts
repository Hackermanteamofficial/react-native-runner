import * as vscode from 'vscode';
import { Device } from '../../types/Device';
import { DeviceManager } from '../../devices/DeviceManager';
import { DeviceStateStore } from '../../devices/DeviceState';

export type DeviceTreeItemType = 'category' | 'device' | 'action';

export class DeviceTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly itemType: DeviceTreeItemType,
        public readonly device?: Device,
        public readonly commandId?: string,
        collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None
    ) {
        super(label, collapsibleState);
        this.setupItem();
    }

    private setupItem(): void {
        if (this.itemType === 'category') {
            this.contextValue = 'category';
            return;
        }

        if (this.itemType === 'action') {
            this.contextValue = 'action';
            if (this.commandId) {
                this.command = {
                    title: this.label,
                    command: this.commandId
                };
            }
            return;
        }

        if (this.device) {
            const isSelected = DeviceStateStore.getInstance().getSelectedDevice()?.id === this.device.id;
            this.contextValue = this.device.state === 'offline' ? 'stoppedEmulator' : 'runningDevice';

            let iconName = 'device-mobile';
            if (this.device.isEmulator) {
                iconName = this.device.state === 'offline' ? 'vm-outline' : 'vm';
            } else if (this.device.connection === 'wifi') {
                iconName = 'radio-tower';
            }

            this.iconPath = new vscode.ThemeIcon(iconName);

            let desc = this.device.state === 'offline' ? 'Stopped' : this.device.state;
            if (this.device.batteryLevel !== undefined) {
                desc += ` | 🔋 ${this.device.batteryLevel}%`;
            }
            if (this.device.networkAddress) {
                desc += ` | 📶 ${this.device.networkAddress}`;
            }

            if (isSelected) {
                desc = `[Active] ${desc}`;
            }

            this.description = desc;
            this.tooltip = `${this.device.name}\nSerial/ID: ${this.device.serial || this.device.id}\nPlatform: ${this.device.platform}\nType: ${this.device.type}`;

            this.command = {
                title: 'Select Device',
                command: 'react-native-runner.selectDirectDevice',
                arguments: [this.device]
            };
        }
    }
}

export class DevicesTreeProvider implements vscode.TreeDataProvider<DeviceTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<DeviceTreeItem | undefined | null | void> = new vscode.EventEmitter<DeviceTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<DeviceTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private deviceManager = DeviceManager.getInstance();

    constructor() {
        this.deviceManager.on('devicesUpdated', () => this.refresh());
        DeviceStateStore.getInstance().on('selectedDeviceChanged', () => this.refresh());
    }

    public refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    public getTreeItem(element: DeviceTreeItem): vscode.TreeItem {
        return element;
    }

    public async getChildren(element?: DeviceTreeItem): Promise<DeviceTreeItem[]> {
        if (element) {
            return [];
        }

        const devices = this.deviceManager.getDevices();
        const items: DeviceTreeItem[] = [];

        // 1. Running Devices & Emulators
        const running = devices.filter(d => d.state !== 'offline');
        if (running.length > 0) {
            items.push(new DeviceTreeItem('RUNNING DEVICES', 'category'));
            for (const d of running) {
                items.push(new DeviceTreeItem(d.name, 'device', d));
            }
        }

        // 2. Installed AVDs (Stopped)
        const stopped = devices.filter(d => d.isEmulator && d.state === 'offline');
        if (stopped.length > 0) {
            items.push(new DeviceTreeItem('INSTALLED EMULATORS (STOPPED)', 'category'));
            for (const d of stopped) {
                items.push(new DeviceTreeItem(d.name, 'device', d));
            }
        }

        // 3. Actions
        items.push(new DeviceTreeItem('ACTIONS', 'category'));
        const pairItem = new DeviceTreeItem('Pair Wireless Device (ADB)...', 'action', undefined, 'rn-pair');
        pairItem.iconPath = new vscode.ThemeIcon('radio-tower');
        items.push(pairItem);

        const emuItem = new DeviceTreeItem('Start Android Emulator...', 'action', undefined, 'rn-emulator');
        emuItem.iconPath = new vscode.ThemeIcon('vm-active');
        items.push(emuItem);

        const refreshItem = new DeviceTreeItem('Refresh Device List', 'action', undefined, 'rn-refresh');
        refreshItem.iconPath = new vscode.ThemeIcon('refresh');
        items.push(refreshItem);

        return items;
    }
}
