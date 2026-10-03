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
exports.DevicesTreeProvider = exports.DeviceTreeItem = void 0;
const vscode = __importStar(require("vscode"));
const DeviceManager_1 = require("../../devices/DeviceManager");
const DeviceState_1 = require("../../devices/DeviceState");
class DeviceTreeItem extends vscode.TreeItem {
    label;
    itemType;
    device;
    commandId;
    constructor(label, itemType, device, commandId, collapsibleState = vscode.TreeItemCollapsibleState.None) {
        super(label, collapsibleState);
        this.label = label;
        this.itemType = itemType;
        this.device = device;
        this.commandId = commandId;
        this.setupItem();
    }
    setupItem() {
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
            const isSelected = DeviceState_1.DeviceStateStore.getInstance().getSelectedDevice()?.id === this.device.id;
            this.contextValue = this.device.state === 'offline' ? 'stoppedEmulator' : 'runningDevice';
            let iconName = 'device-mobile';
            if (this.device.isEmulator) {
                iconName = this.device.state === 'offline' ? 'vm-outline' : 'vm';
            }
            else if (this.device.connection === 'wifi') {
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
exports.DeviceTreeItem = DeviceTreeItem;
class DevicesTreeProvider {
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    deviceManager = DeviceManager_1.DeviceManager.getInstance();
    constructor() {
        this.deviceManager.on('devicesUpdated', () => this.refresh());
        DeviceState_1.DeviceStateStore.getInstance().on('selectedDeviceChanged', () => this.refresh());
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
        const devices = this.deviceManager.getDevices();
        const items = [];
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
exports.DevicesTreeProvider = DevicesTreeProvider;
//# sourceMappingURL=DevicesTreeProvider.js.map