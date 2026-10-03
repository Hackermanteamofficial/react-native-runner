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
exports.startEmulatorCommand = startEmulatorCommand;
const vscode = __importStar(require("vscode"));
const DeviceManager_1 = require("../devices/DeviceManager");
const BootWaiter_1 = require("../devices/BootWaiter");
const Logger_1 = require("../utils/Logger");
async function startEmulatorCommand() {
    const deviceManager = DeviceManager_1.DeviceManager.getInstance();
    const avdManager = deviceManager.getAvdManager();
    const adbManager = deviceManager.getAdbManager();
    const logger = Logger_1.Logger.getInstance();
    const installedAvds = await avdManager.getInstalledAvds();
    if (installedAvds.length === 0) {
        vscode.window.showWarningMessage('No Android Virtual Devices (AVDs) found on this machine. Create one via Android Studio.');
        return;
    }
    const items = installedAvds.map(avd => ({
        label: `$(vm) ${avd.displayName}`,
        description: avd.name,
        avd
    }));
    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select an Android emulator to start:',
        title: 'Start Android Emulator'
    });
    if (!selected) {
        return;
    }
    try {
        await avdManager.startEmulator(selected.avd.name);
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Booting emulator ${selected.avd.displayName}...`,
            cancellable: true
        }, async (progress, token) => {
            const waiter = new BootWaiter_1.BootWaiter(adbManager);
            // Emulators typically start as emulator-5554, emulator-5556, etc.
            // Wait briefly for ADB to list the serial
            let serial = '';
            for (let i = 0; i < 20; i++) {
                if (token.isCancellationRequested) {
                    return;
                }
                await new Promise(r => setTimeout(r, 1000));
                const devices = await adbManager.getDevicesDetailed();
                const emu = devices.find(d => d.serial.startsWith('emulator-'));
                if (emu) {
                    serial = emu.serial;
                    break;
                }
            }
            if (!serial) {
                vscode.window.showInformationMessage(`Emulator process spawned: ${selected.avd.name}`);
                return;
            }
            const booted = await waiter.waitForBoot(serial, {
                timeoutMs: 90000,
                cancellationToken: token,
                onProgress: (sec, msg) => {
                    progress.report({ message: `${msg} (${sec}s)` });
                }
            });
            if (booted) {
                await deviceManager.refreshDevices();
                vscode.window.showInformationMessage(`Emulator ${selected.avd.displayName} (${serial}) is ready!`);
            }
        });
    }
    catch (err) {
        logger.error(`Failed to start emulator: ${err.message}`);
        vscode.window.showErrorMessage(`Failed to start emulator: ${err.message}`);
    }
}
//# sourceMappingURL=startEmulatorCommand.js.map