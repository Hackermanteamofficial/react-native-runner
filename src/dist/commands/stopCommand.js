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
exports.stopCommand = stopCommand;
const vscode = __importStar(require("vscode"));
const RunStateMachine_1 = require("../state/RunStateMachine");
const BuildState_1 = require("../build/BuildState");
const MetroManager_1 = require("../metro/MetroManager");
const DeviceManager_1 = require("../devices/DeviceManager");
async function stopCommand() {
    const stateMachine = RunStateMachine_1.RunStateMachine.getInstance();
    const buildStore = BuildState_1.BuildStateStore.getInstance();
    const metroManager = MetroManager_1.MetroManager.getInstance();
    const deviceManager = DeviceManager_1.DeviceManager.getInstance();
    // Cancel build if building
    if (buildStore.getIsBuilding()) {
        buildStore.cancelBuild();
    }
    const choice = await vscode.window.showQuickPick([
        { label: 'Stop Application Run', action: 'app' },
        { label: 'Stop Metro Bundler Terminal', action: 'metro' },
        { label: 'Kill Running Android Emulator', action: 'emulator' },
        { label: 'Reset Runner State', action: 'reset' }
    ], { title: 'React Native Runner: Stop / Terminate Options' });
    if (!choice) {
        return;
    }
    switch (choice.action) {
        case 'app':
            stateMachine.transition({ type: 'STOP' });
            vscode.window.setStatusBarMessage('$(stop) Runner stopped', 3000);
            break;
        case 'metro':
            metroManager.dispose();
            vscode.window.setStatusBarMessage('$(stop) Metro terminal closed', 3000);
            break;
        case 'emulator': {
            const selected = deviceManager.getSelectedDevice();
            if (selected && selected.isEmulator && selected.serial) {
                await deviceManager.getAvdManager().stopEmulator(selected.serial, deviceManager.getAdbManager());
                await deviceManager.refreshDevices();
                vscode.window.setStatusBarMessage(`$(stop) Emulator ${selected.serial} terminated`, 3000);
            }
            else {
                vscode.window.showWarningMessage('No running emulator selected to stop.');
            }
            break;
        }
        case 'reset':
            stateMachine.reset();
            vscode.window.setStatusBarMessage('$(refresh) State reset to IDLE', 3000);
            break;
    }
}
//# sourceMappingURL=stopCommand.js.map