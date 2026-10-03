import * as vscode from 'vscode';
import { Device } from '../types/Device';
import { DeviceManager } from '../devices/DeviceManager';

export interface DeviceQuickPickItem extends vscode.QuickPickItem {
    device?: Device;
    action?: 'refresh' | 'pair' | 'start-emulator';
}

export class DeviceQuickPick {
    public static async show(deviceManager: DeviceManager): Promise<Device | undefined> {
        const devices = deviceManager.getDevices();
        const selected = deviceManager.getSelectedDevice();

        const items: DeviceQuickPickItem[] = [];

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
                } else if (d.connection === 'wifi') {
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
                    await vscode.commands.executeCommand('rn-refresh');
                    return undefined;
                case 'pair':
                    await vscode.commands.executeCommand('rn-pair');
                    return undefined;
                case 'start-emulator':
                    await vscode.commands.executeCommand('rn-emulator');
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
