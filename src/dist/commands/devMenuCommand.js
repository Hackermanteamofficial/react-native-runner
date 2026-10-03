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
exports.devMenuCommand = devMenuCommand;
const vscode = __importStar(require("vscode"));
const DeviceManager_1 = require("../devices/DeviceManager");
const Logger_1 = require("../utils/Logger");
async function devMenuCommand() {
    const deviceManager = DeviceManager_1.DeviceManager.getInstance();
    const adbManager = deviceManager.getAdbManager();
    const logger = Logger_1.Logger.getInstance();
    const selectedDevice = deviceManager.getSelectedDevice();
    if (!selectedDevice || selectedDevice.state === 'offline' || !selectedDevice.serial) {
        vscode.window.showWarningMessage('No active running device selected to open Dev Menu.');
        return;
    }
    try {
        await adbManager.sendDevMenuKeyEvent(selectedDevice.serial);
        vscode.window.setStatusBarMessage(`$(tools) Dev Menu sent to ${selectedDevice.name}`, 3000);
        logger.info(`Dev Menu (keyevent 82) sent to ${selectedDevice.name} (${selectedDevice.serial}).`);
    }
    catch (e) {
        logger.error(`Failed to send Dev Menu keyevent: ${e.message}`);
        vscode.window.showErrorMessage(`Failed to open Dev Menu: ${e.message}`);
    }
}
//# sourceMappingURL=devMenuCommand.js.map