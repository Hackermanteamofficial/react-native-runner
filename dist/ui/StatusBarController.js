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
exports.StatusBarController = void 0;
const vscode = __importStar(require("vscode"));
const DeviceState_1 = require("../devices/DeviceState");
const RunStateMachine_1 = require("../state/RunStateMachine");
const BuildState_1 = require("../build/BuildState");
const NativeFileWatcher_1 = require("../build/NativeFileWatcher");
class StatusBarController {
    static instance;
    deviceItem;
    runItem;
    buildStateItem;
    reloadItem;
    currentBuildState;
    constructor() {
        // Create Status Bar items with high priority so they group together nicely
        this.deviceItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.deviceItem.command = 'rn-device-runner.selectDevice';
        this.deviceItem.tooltip = 'RN Device Runner: Select Android device or start emulator';
        this.runItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
        this.runItem.command = 'rn-device-runner.run';
        this.runItem.tooltip = 'RN Device Runner: Run application on selected device';
        this.buildStateItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 98);
        this.buildStateItem.tooltip = 'RN Device Runner: Native Android build state';
        this.reloadItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 97);
        this.reloadItem.command = 'rn-device-runner.reload';
        this.reloadItem.text = '$(refresh) Reload';
        this.reloadItem.tooltip = 'RN Device Runner: Reload app on target device';
        this.setupSubscriptions();
    }
    static getInstance() {
        if (!StatusBarController.instance) {
            StatusBarController.instance = new StatusBarController();
        }
        return StatusBarController.instance;
    }
    show() {
        this.updateDeviceItem(DeviceState_1.DeviceStateStore.getInstance().getSelectedDevice());
        this.updateRunItem(RunStateMachine_1.RunStateMachine.getInstance().getState());
        this.deviceItem.show();
        this.runItem.show();
        this.reloadItem.show();
    }
    setupSubscriptions() {
        // Device state changes
        DeviceState_1.DeviceStateStore.getInstance().on('selectedDeviceChanged', (device) => {
            this.updateDeviceItem(device);
        });
        // Run state machine changes
        RunStateMachine_1.RunStateMachine.getInstance().onTransition((_, toState) => {
            this.updateRunItem(toState);
        });
        // Build state changes from real-time file watcher
        NativeFileWatcher_1.NativeFileWatcher.getInstance().on('buildStateChanged', (state) => {
            this.currentBuildState = state;
            this.updateBuildIndicator(state);
        });
        // Build progress changes
        BuildState_1.BuildStateStore.getInstance().on('buildStateChanged', ({ isBuilding }) => {
            if (isBuilding) {
                this.buildStateItem.text = '$(sync~spin) Building Gradle...';
                this.buildStateItem.show();
            }
            else if (this.currentBuildState) {
                this.updateBuildIndicator(this.currentBuildState);
            }
        });
    }
    updateDeviceItem(device) {
        if (!device) {
            this.deviceItem.text = '$(device-mobile) Select Device ▼';
            this.deviceItem.color = new vscode.ThemeColor('descriptionForeground');
            return;
        }
        let icon = '$(device-mobile)';
        if (device.isEmulator) {
            icon = '$(vm)';
        }
        else if (device.connection === 'wifi') {
            icon = '$(radio-tower)';
        }
        const stateIndicator = device.state === 'offline' ? ' (Stopped)' : '';
        this.deviceItem.text = `${icon} ${device.name}${stateIndicator} ▼`;
        this.deviceItem.color = undefined;
    }
    updateRunItem(state) {
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
    updateBuildIndicator(state) {
        if (state.needsNativeBuild) {
            this.buildStateItem.text = '$(tools) Build Needed';
            this.buildStateItem.tooltip = 'Native changes detected. Next run will compile Android Gradle project.';
            this.buildStateItem.color = new vscode.ThemeColor('editorWarning.foreground');
            this.buildStateItem.show();
        }
        else {
            this.buildStateItem.hide();
        }
    }
    dispose() {
        this.deviceItem.dispose();
        this.runItem.dispose();
        this.buildStateItem.dispose();
        this.reloadItem.dispose();
    }
}
exports.StatusBarController = StatusBarController;
//# sourceMappingURL=StatusBarController.js.map