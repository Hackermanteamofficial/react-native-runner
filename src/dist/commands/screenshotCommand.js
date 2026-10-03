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
exports.screenshotCommand = screenshotCommand;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const DeviceManager_1 = require("../devices/DeviceManager");
const DeviceQuickPick_1 = require("../ui/DeviceQuickPick");
const ProjectDetector_1 = require("../project/ProjectDetector");
const Logger_1 = require("../utils/Logger");
async function screenshotCommand() {
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
    const rootPath = project?.rootPath || (vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : process.cwd());
    const screenshotsDir = path.join(rootPath, '.screenshots');
    if (!fs.existsSync(screenshotsDir)) {
        try {
            fs.mkdirSync(screenshotsDir, { recursive: true });
        }
        catch (err) {
            vscode.window.showErrorMessage(`Failed to create screenshots folder: ${err.message}`);
            return;
        }
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `screenshot_${timestamp}.png`;
    const targetPath = path.join(screenshotsDir, filename);
    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Capturing screenshot from ${device.name}...`
        }, async () => {
            await adbManager.takeScreenshot(device.serial, targetPath);
        });
        vscode.window.showInformationMessage(`Screenshot saved: ${filename}`, 'Open Image', 'Reveal in File Explorer').then(choice => {
            if (choice === 'Open Image') {
                vscode.commands.executeCommand('vscode.open', vscode.Uri.file(targetPath));
            }
            else if (choice === 'Reveal in File Explorer') {
                vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(targetPath));
            }
        });
    }
    catch (e) {
        logger.error(`Screenshot failed: ${e.message}`);
        vscode.window.showErrorMessage(`Failed to capture screenshot: ${e.message}`);
    }
}
//# sourceMappingURL=screenshotCommand.js.map