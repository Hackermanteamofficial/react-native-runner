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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const DeviceManager_1 = require("./devices/DeviceManager");
const ProjectDetector_1 = require("./project/ProjectDetector");
const NativeFileWatcher_1 = require("./build/NativeFileWatcher");
const StatusBarController_1 = require("./ui/StatusBarController");
const ConfigurationManager_1 = require("./config/ConfigurationManager");
const Logger_1 = require("./utils/Logger");
// Commands
const selectDeviceCommand_1 = require("./commands/selectDeviceCommand");
const runCommand_1 = require("./commands/runCommand");
const reloadCommand_1 = require("./commands/reloadCommand");
const refreshDevicesCommand_1 = require("./commands/refreshDevicesCommand");
const startEmulatorCommand_1 = require("./commands/startEmulatorCommand");
const pairDeviceCommand_1 = require("./commands/pairDeviceCommand");
const stopCommand_1 = require("./commands/stopCommand");
const diagnoseCommand_1 = require("./commands/diagnoseCommand");
async function activate(context) {
    const logger = Logger_1.Logger.getInstance();
    logger.info('Activating RN Device Runner Extension (v2)...');
    // 1. Initialize configuration manager
    const configManager = ConfigurationManager_1.ConfigurationManager.getInstance();
    context.subscriptions.push(configManager.onDidChangeConfiguration(async () => {
        logger.info('Configuration updated, syncing SDK and tools paths...');
        await DeviceManager_1.DeviceManager.getInstance().syncSdkPaths();
    }));
    // 2. Initialize device manager (tracks ADB socket natively without polling)
    const deviceManager = DeviceManager_1.DeviceManager.getInstance();
    await deviceManager.initialize();
    // 3. Detect active project and initialize real-time native file watcher
    const projectDetector = ProjectDetector_1.ProjectDetector.getInstance();
    const project = await projectDetector.detect();
    if (project) {
        NativeFileWatcher_1.NativeFileWatcher.getInstance().startWatching(project.rootPath);
    }
    // 4. Initialize Status Bar items
    const statusBar = StatusBarController_1.StatusBarController.getInstance();
    statusBar.show();
    // 5. Register Extension Commands (Short IDs with backward-compatible aliases)
    context.subscriptions.push(
    // Primary short commands
    vscode.commands.registerCommand('rn-run', runCommand_1.runCommand), vscode.commands.registerCommand('rn-stop', stopCommand_1.stopCommand), vscode.commands.registerCommand('rn-reload', reloadCommand_1.reloadCommand), vscode.commands.registerCommand('rn-select', selectDeviceCommand_1.selectDeviceCommand), vscode.commands.registerCommand('rn-refresh', refreshDevicesCommand_1.refreshDevicesCommand), vscode.commands.registerCommand('rn-emulator', startEmulatorCommand_1.startEmulatorCommand), vscode.commands.registerCommand('rn-pair', pairDeviceCommand_1.pairDeviceCommand), vscode.commands.registerCommand('rn-diagnose', diagnoseCommand_1.diagnoseCommand), 
    // Backward compatibility aliases
    vscode.commands.registerCommand('rn-device-runner.run', runCommand_1.runCommand), vscode.commands.registerCommand('rn-device-runner.stop', stopCommand_1.stopCommand), vscode.commands.registerCommand('rn-device-runner.reload', reloadCommand_1.reloadCommand), vscode.commands.registerCommand('rn-device-runner.selectDevice', selectDeviceCommand_1.selectDeviceCommand), vscode.commands.registerCommand('rn-device-runner.refreshDevices', refreshDevicesCommand_1.refreshDevicesCommand), vscode.commands.registerCommand('rn-device-runner.startEmulator', startEmulatorCommand_1.startEmulatorCommand), vscode.commands.registerCommand('rn-device-runner.pairWirelessDevice', pairDeviceCommand_1.pairDeviceCommand), vscode.commands.registerCommand('rn-device-runner.diagnose', diagnoseCommand_1.diagnoseCommand));
    // Register project switch listener if workspace folders change
    context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(async () => {
        logger.info('Workspace folders changed, re-detecting project...');
        projectDetector.clearCache();
        const updated = await projectDetector.detect();
        if (updated) {
            NativeFileWatcher_1.NativeFileWatcher.getInstance().startWatching(updated.rootPath);
        }
    }));
    // Register disposables
    context.subscriptions.push({ dispose: () => deviceManager.dispose() }, { dispose: () => NativeFileWatcher_1.NativeFileWatcher.getInstance().dispose() }, { dispose: () => statusBar.dispose() }, { dispose: () => logger.dispose() });
    logger.info('RN Device Runner activated successfully.');
}
function deactivate() {
    DeviceManager_1.DeviceManager.getInstance().dispose();
    NativeFileWatcher_1.NativeFileWatcher.getInstance().dispose();
    StatusBarController_1.StatusBarController.getInstance().dispose();
    Logger_1.Logger.getInstance().dispose();
}
//# sourceMappingURL=extension.js.map