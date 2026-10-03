import * as vscode from 'vscode';
import { Device } from '../types/Device';
import { DeviceStateStore } from '../devices/DeviceState';
import { RunStateMachine } from '../state/RunStateMachine';
import { BuildStateStore } from '../build/BuildState';
import { NativeFileWatcher } from '../build/NativeFileWatcher';
import { BuildState } from '../types/Build';
import { RunState } from '../types/State';

export class StatusBarController {
    private static instance: StatusBarController;

    private deviceItem: vscode.StatusBarItem;
    private runItem: vscode.StatusBarItem;
    private buildStateItem: vscode.StatusBarItem;
    private reloadItem: vscode.StatusBarItem;

    private currentBuildState: BuildState | undefined;

    private constructor() {
        // Create Status Bar items with high priority so they group together nicely
        this.deviceItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.deviceItem.command = 'rn-select';
        this.deviceItem.tooltip = 'RN: Select Android device or start emulator (rn-select)';

        this.runItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
        this.runItem.command = 'rn-run';
        this.runItem.tooltip = 'RN: Run application on selected device (rn-run)';

        this.buildStateItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 98);
        this.buildStateItem.tooltip = 'RN: Native Android build state';

        this.reloadItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 97);
        this.reloadItem.command = 'rn-reload';
        this.reloadItem.text = '$(refresh) Reload';
        this.reloadItem.tooltip = 'RN: Reload app on target device (rn-reload)';

        this.setupSubscriptions();
    }

    public static getInstance(): StatusBarController {
        if (!StatusBarController.instance) {
            StatusBarController.instance = new StatusBarController();
        }
        return StatusBarController.instance;
    }

    public show(): void {
        this.updateDeviceItem(DeviceStateStore.getInstance().getSelectedDevice());
        this.updateRunItem(RunStateMachine.getInstance().getState());
        this.deviceItem.show();
        this.runItem.show();
        this.reloadItem.show();
    }

    private setupSubscriptions(): void {
        // Device state changes
        DeviceStateStore.getInstance().on('selectedDeviceChanged', (device?: Device) => {
            this.updateDeviceItem(device);
        });

        // Run state machine changes
        RunStateMachine.getInstance().onTransition((_, toState) => {
            this.updateRunItem(toState);
        });

        // Build state changes from real-time file watcher
        NativeFileWatcher.getInstance().on('buildStateChanged', (state: BuildState) => {
            this.currentBuildState = state;
            this.updateBuildIndicator(state);
        });

        // Build progress changes
        BuildStateStore.getInstance().on('buildStateChanged', ({ isBuilding }) => {
            if (isBuilding) {
                this.buildStateItem.text = '$(sync~spin) Building Gradle...';
                this.buildStateItem.show();
            } else if (this.currentBuildState) {
                this.updateBuildIndicator(this.currentBuildState);
            }
        });
    }

    private updateDeviceItem(device?: Device): void {
        if (!device) {
            this.deviceItem.text = '$(device-mobile) Select Device ▼';
            this.deviceItem.color = new vscode.ThemeColor('descriptionForeground');
            return;
        }

        let icon = '$(device-mobile)';
        if (device.isEmulator) {
            icon = '$(vm)';
        } else if (device.connection === 'wifi') {
            icon = '$(radio-tower)';
        }

        const stateIndicator = device.state === 'offline' ? ' (Stopped)' : '';
        this.deviceItem.text = `${icon} ${device.name}${stateIndicator} ▼`;
        this.deviceItem.color = undefined;
    }

    private updateRunItem(state: RunState): void {
        switch (state) {
            case 'IDLE':
            case 'DEVICE_SELECTED':
            case 'DEVICE_READY':
                this.runItem.text = '$(play) Run RN';
                this.runItem.color = undefined;
                break;
            case 'CHECKING':
                this.runItem.text = '$(sync~spin) Checking...';
                break;
            case 'STARTING_DEVICE':
                this.runItem.text = '$(loading~spin) Booting...';
                break;
            case 'CHECKING_BUILD':
                this.runItem.text = '$(sync~spin) Checking Build...';
                break;
            case 'BUILDING':
                this.runItem.text = '$(sync~spin) Building...';
                break;
            case 'INSTALLING':
                this.runItem.text = '$(cloud-upload) Installing APK...';
                break;
            case 'METRO_STARTING':
                this.runItem.text = '$(radio-tower) Metro Starting...';
                break;
            case 'LAUNCHING':
                this.runItem.text = '$(rocket) Launching...';
                break;
            case 'RUNNING':
                this.runItem.text = '$(check) Running';
                this.runItem.color = new vscode.ThemeColor('testing.iconPassed');
                break;
            case 'ERROR':
                this.runItem.text = '$(error) Failed (Retry)';
                this.runItem.color = new vscode.ThemeColor('errorForeground');
                break;
        }
    }

    private updateBuildIndicator(state: BuildState): void {
        if (state.needsNativeBuild) {
            this.buildStateItem.text = '$(tools) Build Needed';
            this.buildStateItem.tooltip = 'Native changes detected. Next run will compile Android Gradle project.';
            this.buildStateItem.color = new vscode.ThemeColor('editorWarning.foreground');
            this.buildStateItem.show();
        } else {
            this.buildStateItem.hide();
        }
    }

    public dispose(): void {
        this.deviceItem.dispose();
        this.runItem.dispose();
        this.buildStateItem.dispose();
        this.reloadItem.dispose();
    }
}
