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
exports.deepLinkCommand = deepLinkCommand;
const vscode = __importStar(require("vscode"));
const ProjectDetector_1 = require("../project/ProjectDetector");
const DeviceManager_1 = require("../devices/DeviceManager");
const DeviceQuickPick_1 = require("../ui/DeviceQuickPick");
const Logger_1 = require("../utils/Logger");
async function deepLinkCommand() {
    const logger = Logger_1.Logger.getInstance();
    const deviceManager = DeviceManager_1.DeviceManager.getInstance();
    const adbManager = deviceManager.getAdbManager();
    let device = deviceManager.getSelectedDevice();
    if (!device || device.state === 'offline' || !device.serial) {
        device = await DeviceQuickPick_1.DeviceQuickPick.show(deviceManager);
        if (!device || !device.serial) {
            return;
        }
    }
    const project = await ProjectDetector_1.ProjectDetector.getInstance().detect();
    const defaultPlaceholder = project?.appScheme ? `${project.appScheme}://` : 'myapp://';
    const url = await vscode.window.showInputBox({
        title: 'React Native Runner: Open Deep Link',
        prompt: 'Enter custom scheme or universal deep link URL:',
        value: defaultPlaceholder,
        valueSelection: [defaultPlaceholder.length, defaultPlaceholder.length]
    });
    if (!url || url.trim().length === 0) {
        return;
    }
    try {
        await adbManager.startActivityUri(device.serial, url.trim());
        vscode.window.setStatusBarMessage(`$(link-external) Deep link launched: ${url}`, 3000);
        logger.info(`Opened deep link "${url}" on ${device.name} (${device.serial}).`);
    }
    catch (e) {
        logger.error(`Failed to launch deep link: ${e.message}`);
        vscode.window.showErrorMessage(`Deep link failed: ${e.message}`);
    }
}
//# sourceMappingURL=deepLinkCommand.js.map