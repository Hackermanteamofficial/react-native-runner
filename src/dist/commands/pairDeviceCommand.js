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
exports.pairDeviceCommand = pairDeviceCommand;
const vscode = __importStar(require("vscode"));
const DeviceManager_1 = require("../devices/DeviceManager");
const Logger_1 = require("../utils/Logger");
async function pairDeviceCommand() {
    const deviceManager = DeviceManager_1.DeviceManager.getInstance();
    const wireless = deviceManager.getWirelessPairing();
    const logger = Logger_1.Logger.getInstance();
    const action = await vscode.window.showQuickPick([
        {
            label: '$(radio-tower) Pair New Device (Android 11+)',
            description: 'Requires Wi-Fi pairing code and port from Developer Options',
            mode: 'pair'
        },
        {
            label: '$(plug) Direct Connect (Standard port 5555)',
            description: 'Connect to already paired device at IP:5555',
            mode: 'connect'
        }
    ], {
        title: 'React Native Runner: Wireless ADB Setup',
        placeHolder: 'Select pairing method:'
    });
    if (!action) {
        return;
    }
    if (action.mode === 'pair') {
        const pairingAddress = await vscode.window.showInputBox({
            prompt: 'Enter IP address & pairing port (from "Pair device with pairing code" on phone):',
            placeHolder: '192.168.1.100:37482',
            validateInput: val => {
                if (!/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}:[0-9]{1,5}$/.test(val.trim())) {
                    return 'Please enter a valid IP:port (e.g. 192.168.1.50:41235)';
                }
                return null;
            }
        });
        if (!pairingAddress) {
            return;
        }
        const pairingCode = await vscode.window.showInputBox({
            prompt: 'Enter 6-digit Wi-Fi pairing code:',
            placeHolder: '123456',
            validateInput: val => {
                if (!val.trim() || !/^\d{6}$/.test(val.trim())) {
                    return 'Please enter the 6-digit code shown on your phone screen.';
                }
                return null;
            }
        });
        if (!pairingCode) {
            return;
        }
        const connectPort = await vscode.window.showInputBox({
            prompt: 'Enter the main Wireless debugging port (from main Wireless debugging screen):',
            placeHolder: '5555 or dynamic port (e.g. 42351)',
            value: pairingAddress.split(':')[0] + ':5555'
        });
        if (!connectPort) {
            return;
        }
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Pairing wireless device with ${pairingAddress}...`,
            cancellable: false
        }, async () => {
            const pairResult = await wireless.pair(pairingAddress, pairingCode);
            if (!pairResult.success) {
                vscode.window.showErrorMessage(`Wireless pairing failed: ${pairResult.message}`);
                return;
            }
            logger.info('Pairing succeeded. Connecting to device...');
            const connectResult = await wireless.connect(connectPort);
            if (connectResult.success) {
                await deviceManager.refreshDevices();
                vscode.window.showInformationMessage(`Successfully connected to ${connectPort} via Wi-Fi!`);
            }
            else {
                vscode.window.showWarningMessage(`Paired, but connect failed: ${connectResult.message}`);
            }
        });
    }
    else {
        const address = await vscode.window.showInputBox({
            prompt: 'Enter device IP and port:',
            placeHolder: '192.168.1.100:5555',
            value: '192.168.1.'
        });
        if (!address) {
            return;
        }
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Connecting to ${address}...`,
            cancellable: false
        }, async () => {
            const result = await wireless.connect(address);
            if (result.success) {
                await deviceManager.refreshDevices();
                vscode.window.showInformationMessage(`Connected to ${address} via Wi-Fi!`);
            }
            else {
                vscode.window.showErrorMessage(`Connection failed: ${result.message}`);
            }
        });
    }
}
//# sourceMappingURL=pairDeviceCommand.js.map