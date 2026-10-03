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
exports.DeviceQuickPick = void 0;
const vscode = __importStar(require("vscode"));
class DeviceQuickPick {
    static async show(deviceManager) {
        const devices = deviceManager.getDevices();
        const selected = deviceManager.getSelectedDevice();
        const items = [];
        // 1. Running Devices & Emulators
        const runningDevices = devices.filter(d => d.state !== 'offline');
        if (runningDevices.length > 0) {
            items.push({
                label: 'RUNNING DEVICES',
                kind: vscode.QuickPickItemKind.Separator
            });
            for (const d of runningDevices) {
                const isCurrent = selected && (selected.id === d.id || selected.avdName === d.avdName);
                let icon = '$(device-mobile)';
                if (d.isEmulator) {
                    icon = '$(vm)';
                }
                else if (d.connection === 'wifi') {
                    icon = '$(radio-tower)';
                }
                let detail = `Status: ${d.state}`;
                if (d.apiLevel) {
                    detail += ` | API ${d.apiLevel}`;
                }
                if (d.connection) {
                    detail += ` | ${d.connection.toUpperCase()}`;
                }
                items.push({
                    label: `${icon} ${d.name}`,
                    description: isCurrent ? '$(check) Active' : (d.serial || d.id),
                    detail,
                    device: d
                });
            }
        }
        // 2. Installed AVDs (Stopped)
        const stoppedAvds = devices.filter(d => d.isEmulator && d.state === 'offline');
        if (stoppedAvds.length > 0) {
            items.push({
                label: 'INSTALLED EMULATORS (STOPPED)',
                kind: vscode.QuickPickItemKind.Separator
            });
            for (const d of stoppedAvds) {
                const isCurrent = selected && selected.avdName === d.avdName;
                items.push({
                    label: `$(vm-outline) ${d.name}`,
                    description: isCurrent ? '$(check) Selected (will launch)' : 'Stopped',
                    detail: 'Select to boot on run',
                    device: d
                });
            }
        }
        // 3. Actions Separator
        items.push({
            label: 'ACTIONS',
            kind: vscode.QuickPickItemKind.Separator
        });
        items.push({
            label: '$(radio-tower) Pair Wireless Device (ADB)...',
            description: 'Connect phone via Wi-Fi (Redmi Note, etc.)',
            action: 'pair'
        });
        items.push({
            label: '$(vm-active) Start Android Emulator...',
            description: 'Cold boot an installed AVD',
            action: 'start-emulator'
        });
        items.push({
            label: '$(refresh) Refresh Device List',
            description: 'Rescan ADB and installed AVDs',
            action: 'refresh'
        });
        const picked = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select target device or emulator...',
            title: 'RN Device Runner: Devices'
        });
        if (!picked) {
            return undefined;
        }
        if (picked.action) {
            switch (picked.action) {
                case 'refresh':
                    await vscode.commands.executeCommand('rn-device-runner.refreshDevices');
                    return undefined;
                case 'pair':
                    await vscode.commands.executeCommand('rn-device-runner.pairWirelessDevice');
                    return undefined;
                case 'start-emulator':
                    await vscode.commands.executeCommand('rn-device-runner.startEmulator');
                    return undefined;
            }
        }
        if (picked.device) {
            await deviceManager.selectDevice(picked.device);
            return picked.device;
        }
        return undefined;
    }
}
exports.DeviceQuickPick = DeviceQuickPick;
//# sourceMappingURL=DeviceQuickPick.js.map