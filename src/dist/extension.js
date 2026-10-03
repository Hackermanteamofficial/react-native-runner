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
const devMenuCommand_1 = require("./commands/devMenuCommand");
const logcatCommand_1 = require("./commands/logcatCommand");
const deepLinkCommand_1 = require("./commands/deepLinkCommand");
const cleanMetroCommand_1 = require("./commands/cleanMetroCommand");
const clearAppDataCommand_1 = require("./commands/clearAppDataCommand");
const uninstallAppCommand_1 = require("./commands/uninstallAppCommand");
const screenshotCommand_1 = require("./commands/screenshotCommand");
const debugCommand_1 = require("./commands/debugCommand");
const selectFlavorCommand_1 = require("./commands/selectFlavorCommand");
const killPortCommand_1 = require("./commands/killPortCommand");
const LogcatStreamer_1 = require("./logging/LogcatStreamer");
const DevicesTreeProvider_1 = require("./ui/views/DevicesTreeProvider");
const ActionsTreeProvider_1 = require("./ui/views/ActionsTreeProvider");
const BuildStatusTreeProvider_1 = require("./ui/views/BuildStatusTreeProvider");
const BuildCache_1 = require("./build/BuildCache");
async function activate(context) {
    const logger = Logger_1.Logger.getInstance();
    logger.info('Activating React Native Runner Extension (v2)...');
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
    // 5. Initialize Activity Bar Sidebar TreeViews
    const devicesTreeProvider = new DevicesTreeProvider_1.DevicesTreeProvider();
    const actionsTreeProvider = new ActionsTreeProvider_1.ActionsTreeProvider();
    const buildStatusTreeProvider = new BuildStatusTreeProvider_1.BuildStatusTreeProvider();
    context.subscriptions.push(vscode.window.registerTreeDataProvider('rn-runner-devices', devicesTreeProvider), vscode.window.registerTreeDataProvider('rn-runner-actions', actionsTreeProvider), vscode.window.registerTreeDataProvider('rn-runner-build', buildStatusTreeProvider));
    // 6. Register Extension Commands (Short IDs with backward-compatible aliases)
    context.subscriptions.push(
    // Primary short commands
    vscode.commands.registerCommand('rn-run', runCommand_1.runCommand), vscode.commands.registerCommand('rn-stop', stopCommand_1.stopCommand), vscode.commands.registerCommand('rn-reload', reloadCommand_1.reloadCommand), vscode.commands.registerCommand('rn-select', selectDeviceCommand_1.selectDeviceCommand), vscode.commands.registerCommand('rn-refresh', refreshDevicesCommand_1.refreshDevicesCommand), vscode.commands.registerCommand('rn-emulator', startEmulatorCommand_1.startEmulatorCommand), vscode.commands.registerCommand('rn-pair', pairDeviceCommand_1.pairDeviceCommand), vscode.commands.registerCommand('rn-diagnose', diagnoseCommand_1.diagnoseCommand), vscode.commands.registerCommand('rn-dev-menu', devMenuCommand_1.devMenuCommand), vscode.commands.registerCommand('rn-logcat', logcatCommand_1.logcatCommand), vscode.commands.registerCommand('rn-deep-link', deepLinkCommand_1.deepLinkCommand), vscode.commands.registerCommand('rn-metro-clean', cleanMetroCommand_1.cleanMetroCommand), vscode.commands.registerCommand('rn-clear-data', clearAppDataCommand_1.clearAppDataCommand), vscode.commands.registerCommand('rn-uninstall', uninstallAppCommand_1.uninstallAppCommand), vscode.commands.registerCommand('rn-screenshot', screenshotCommand_1.screenshotCommand), vscode.commands.registerCommand('rn-debug', debugCommand_1.debugCommand), vscode.commands.registerCommand('rn-select-flavor', selectFlavorCommand_1.selectFlavorCommand), vscode.commands.registerCommand('rn-kill-port', killPortCommand_1.killPortCommand), 
    // Backward compatibility and extension ID aliases
    vscode.commands.registerCommand('react-native-runner.run', runCommand_1.runCommand), vscode.commands.registerCommand('react-native-runner.stop', stopCommand_1.stopCommand), vscode.commands.registerCommand('react-native-runner.reload', reloadCommand_1.reloadCommand), vscode.commands.registerCommand('react-native-runner.selectDevice', selectDeviceCommand_1.selectDeviceCommand), vscode.commands.registerCommand('react-native-runner.refreshDevices', refreshDevicesCommand_1.refreshDevicesCommand), vscode.commands.registerCommand('react-native-runner.startEmulator', startEmulatorCommand_1.startEmulatorCommand), vscode.commands.registerCommand('react-native-runner.pairWirelessDevice', pairDeviceCommand_1.pairDeviceCommand), vscode.commands.registerCommand('react-native-runner.diagnose', diagnoseCommand_1.diagnoseCommand), vscode.commands.registerCommand('react-native-runner.devMenu', devMenuCommand_1.devMenuCommand), vscode.commands.registerCommand('react-native-runner.streamLogcat', logcatCommand_1.logcatCommand), vscode.commands.registerCommand('react-native-runner.openDeepLink', deepLinkCommand_1.deepLinkCommand), vscode.commands.registerCommand('react-native-runner.startMetroClean', cleanMetroCommand_1.cleanMetroCommand), vscode.commands.registerCommand('react-native-runner.clearData', clearAppDataCommand_1.clearAppDataCommand), vscode.commands.registerCommand('react-native-runner.uninstall', uninstallAppCommand_1.uninstallAppCommand), vscode.commands.registerCommand('react-native-runner.screenshot', screenshotCommand_1.screenshotCommand), vscode.commands.registerCommand('react-native-runner.attachDebugger', debugCommand_1.debugCommand), vscode.commands.registerCommand('react-native-runner.selectFlavor', selectFlavorCommand_1.selectFlavorCommand), vscode.commands.registerCommand('react-native-runner.killPort', killPortCommand_1.killPortCommand), 
    // TreeView interactive helper commands
    vscode.commands.registerCommand('react-native-runner.selectDirectDevice', async (device) => {
        if (device) {
            await deviceManager.selectDevice(device);
            vscode.window.setStatusBarMessage(`$(check) Selected device: ${device.name}`, 3000);
        }
    }), vscode.commands.registerCommand('react-native-runner.rebuildClean', async () => {
        const detected = await projectDetector.detect();
        if (detected) {
            await BuildCache_1.BuildCache.getInstance().invalidate(detected.rootPath);
            await (0, runCommand_1.runCommand)();
        }
    }), vscode.commands.registerCommand('react-native-runner.invalidateCache', async () => {
        const detected = await projectDetector.detect();
        if (detected) {
            await BuildCache_1.BuildCache.getInstance().invalidate(detected.rootPath);
            buildStatusTreeProvider.refresh();
            vscode.window.showInformationMessage('Native build cache invalidated.');
        }
    }), vscode.commands.registerCommand('react-native-runner.refreshDevicesTree', async () => {
        await deviceManager.refreshDevices();
        devicesTreeProvider.refresh();
    }), vscode.commands.registerCommand('rn-device-runner.run', runCommand_1.runCommand), vscode.commands.registerCommand('rn-device-runner.stop', stopCommand_1.stopCommand), vscode.commands.registerCommand('rn-device-runner.reload', reloadCommand_1.reloadCommand), vscode.commands.registerCommand('rn-device-runner.selectDevice', selectDeviceCommand_1.selectDeviceCommand), vscode.commands.registerCommand('rn-device-runner.refreshDevices', refreshDevicesCommand_1.refreshDevicesCommand), vscode.commands.registerCommand('rn-device-runner.startEmulator', startEmulatorCommand_1.startEmulatorCommand), vscode.commands.registerCommand('rn-device-runner.pairWirelessDevice', pairDeviceCommand_1.pairDeviceCommand), vscode.commands.registerCommand('rn-device-runner.diagnose', diagnoseCommand_1.diagnoseCommand));
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
    context.subscriptions.push({ dispose: () => deviceManager.dispose() }, { dispose: () => NativeFileWatcher_1.NativeFileWatcher.getInstance().dispose() }, { dispose: () => statusBar.dispose() }, { dispose: () => LogcatStreamer_1.LogcatStreamer.getInstance().dispose() }, { dispose: () => logger.dispose() });
    logger.info('React Native Runner activated successfully.');
}
function deactivate() {
    DeviceManager_1.DeviceManager.getInstance().dispose();
    NativeFileWatcher_1.NativeFileWatcher.getInstance().dispose();
    StatusBarController_1.StatusBarController.getInstance().dispose();
    Logger_1.Logger.getInstance().dispose();
}
//# sourceMappingURL=extension.js.map