import * as vscode from 'vscode';
import { DeviceManager } from './devices/DeviceManager';
import { ProjectDetector } from './project/ProjectDetector';
import { NativeFileWatcher } from './build/NativeFileWatcher';
import { StatusBarController } from './ui/StatusBarController';
import { ConfigurationManager } from './config/ConfigurationManager';
import { Logger } from './utils/Logger';

// Commands
import { selectDeviceCommand } from './commands/selectDeviceCommand';
import { runCommand } from './commands/runCommand';
import { reloadCommand } from './commands/reloadCommand';
import { refreshDevicesCommand } from './commands/refreshDevicesCommand';
import { startEmulatorCommand } from './commands/startEmulatorCommand';
import { pairDeviceCommand } from './commands/pairDeviceCommand';
import { stopCommand } from './commands/stopCommand';
import { diagnoseCommand } from './commands/diagnoseCommand';
import { devMenuCommand } from './commands/devMenuCommand';
import { logcatCommand } from './commands/logcatCommand';
import { deepLinkCommand } from './commands/deepLinkCommand';
import { cleanMetroCommand } from './commands/cleanMetroCommand';
import { clearAppDataCommand } from './commands/clearAppDataCommand';
import { uninstallAppCommand } from './commands/uninstallAppCommand';
import { screenshotCommand } from './commands/screenshotCommand';
import { debugCommand } from './commands/debugCommand';
import { selectFlavorCommand } from './commands/selectFlavorCommand';
import { killPortCommand } from './commands/killPortCommand';
import { LogcatStreamer } from './logging/LogcatStreamer';
import { DevicesTreeProvider } from './ui/views/DevicesTreeProvider';
import { ActionsTreeProvider } from './ui/views/ActionsTreeProvider';
import { BuildStatusTreeProvider } from './ui/views/BuildStatusTreeProvider';
import { BuildCache } from './build/BuildCache';
import { Device } from './types/Device';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    const logger = Logger.getInstance();
    logger.info('Activating React Native Runner Extension (v2)...');

    // 1. Initialize configuration manager
    const configManager = ConfigurationManager.getInstance();
    context.subscriptions.push(
        configManager.onDidChangeConfiguration(async () => {
            logger.info('Configuration updated, syncing SDK and tools paths...');
            await DeviceManager.getInstance().syncSdkPaths();
        })
    );

    // 2. Initialize device manager (tracks ADB socket natively without polling)
    const deviceManager = DeviceManager.getInstance();
    await deviceManager.initialize();

    // 3. Detect active project and initialize real-time native file watcher
    const projectDetector = ProjectDetector.getInstance();
    const project = await projectDetector.detect();
    if (project) {
        NativeFileWatcher.getInstance().startWatching(project.rootPath);
    }

    // 4. Initialize Status Bar items
    const statusBar = StatusBarController.getInstance();
    statusBar.show();

    // 5. Initialize Activity Bar Sidebar TreeViews
    const devicesTreeProvider = new DevicesTreeProvider();
    const actionsTreeProvider = new ActionsTreeProvider();
    const buildStatusTreeProvider = new BuildStatusTreeProvider();

    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('rn-runner-devices', devicesTreeProvider),
        vscode.window.registerTreeDataProvider('rn-runner-actions', actionsTreeProvider),
        vscode.window.registerTreeDataProvider('rn-runner-build', buildStatusTreeProvider)
    );

    // 6. Register Extension Commands (Short IDs with backward-compatible aliases)
    context.subscriptions.push(
        // Primary short commands
        vscode.commands.registerCommand('rn-run', runCommand),
        vscode.commands.registerCommand('rn-stop', stopCommand),
        vscode.commands.registerCommand('rn-reload', reloadCommand),
        vscode.commands.registerCommand('rn-select', selectDeviceCommand),
        vscode.commands.registerCommand('rn-refresh', refreshDevicesCommand),
        vscode.commands.registerCommand('rn-emulator', startEmulatorCommand),
        vscode.commands.registerCommand('rn-pair', pairDeviceCommand),
        vscode.commands.registerCommand('rn-diagnose', diagnoseCommand),
        vscode.commands.registerCommand('rn-dev-menu', devMenuCommand),
        vscode.commands.registerCommand('rn-logcat', logcatCommand),
        vscode.commands.registerCommand('rn-deep-link', deepLinkCommand),
        vscode.commands.registerCommand('rn-metro-clean', cleanMetroCommand),
        vscode.commands.registerCommand('rn-clear-data', clearAppDataCommand),
        vscode.commands.registerCommand('rn-uninstall', uninstallAppCommand),
        vscode.commands.registerCommand('rn-screenshot', screenshotCommand),
        vscode.commands.registerCommand('rn-debug', debugCommand),
        vscode.commands.registerCommand('rn-select-flavor', selectFlavorCommand),
        vscode.commands.registerCommand('rn-kill-port', killPortCommand),

        // Backward compatibility and extension ID aliases
        vscode.commands.registerCommand('react-native-runner.run', runCommand),
        vscode.commands.registerCommand('react-native-runner.stop', stopCommand),
        vscode.commands.registerCommand('react-native-runner.reload', reloadCommand),
        vscode.commands.registerCommand('react-native-runner.selectDevice', selectDeviceCommand),
        vscode.commands.registerCommand('react-native-runner.refreshDevices', refreshDevicesCommand),
        vscode.commands.registerCommand('react-native-runner.startEmulator', startEmulatorCommand),
        vscode.commands.registerCommand('react-native-runner.pairWirelessDevice', pairDeviceCommand),
        vscode.commands.registerCommand('react-native-runner.diagnose', diagnoseCommand),
        vscode.commands.registerCommand('react-native-runner.devMenu', devMenuCommand),
        vscode.commands.registerCommand('react-native-runner.streamLogcat', logcatCommand),
        vscode.commands.registerCommand('react-native-runner.openDeepLink', deepLinkCommand),
        vscode.commands.registerCommand('react-native-runner.startMetroClean', cleanMetroCommand),
        vscode.commands.registerCommand('react-native-runner.clearData', clearAppDataCommand),
        vscode.commands.registerCommand('react-native-runner.uninstall', uninstallAppCommand),
        vscode.commands.registerCommand('react-native-runner.screenshot', screenshotCommand),
        vscode.commands.registerCommand('react-native-runner.attachDebugger', debugCommand),
        vscode.commands.registerCommand('react-native-runner.selectFlavor', selectFlavorCommand),
        vscode.commands.registerCommand('react-native-runner.killPort', killPortCommand),

        // TreeView interactive helper commands
        vscode.commands.registerCommand('react-native-runner.selectDirectDevice', async (device: Device) => {
            if (device) {
                await deviceManager.selectDevice(device);
                vscode.window.setStatusBarMessage(`$(check) Selected device: ${device.name}`, 3000);
            }
        }),
        vscode.commands.registerCommand('react-native-runner.rebuildClean', async () => {
            const detected = await projectDetector.detect();
            if (detected) {
                await BuildCache.getInstance().invalidate(detected.rootPath);
                await runCommand();
            }
        }),
        vscode.commands.registerCommand('react-native-runner.invalidateCache', async () => {
            const detected = await projectDetector.detect();
            if (detected) {
                await BuildCache.getInstance().invalidate(detected.rootPath);
                buildStatusTreeProvider.refresh();
                vscode.window.showInformationMessage('Native build cache invalidated.');
            }
        }),
        vscode.commands.registerCommand('react-native-runner.refreshDevicesTree', async () => {
            await deviceManager.refreshDevices();
            devicesTreeProvider.refresh();
        }),

        vscode.commands.registerCommand('rn-device-runner.run', runCommand),
        vscode.commands.registerCommand('rn-device-runner.stop', stopCommand),
        vscode.commands.registerCommand('rn-device-runner.reload', reloadCommand),
        vscode.commands.registerCommand('rn-device-runner.selectDevice', selectDeviceCommand),
        vscode.commands.registerCommand('rn-device-runner.refreshDevices', refreshDevicesCommand),
        vscode.commands.registerCommand('rn-device-runner.startEmulator', startEmulatorCommand),
        vscode.commands.registerCommand('rn-device-runner.pairWirelessDevice', pairDeviceCommand),
        vscode.commands.registerCommand('rn-device-runner.diagnose', diagnoseCommand)
    );

    // Register project switch listener if workspace folders change
    context.subscriptions.push(
        vscode.workspace.onDidChangeWorkspaceFolders(async () => {
            logger.info('Workspace folders changed, re-detecting project...');
            projectDetector.clearCache();
            const updated = await projectDetector.detect();
            if (updated) {
                NativeFileWatcher.getInstance().startWatching(updated.rootPath);
            }
        })
    );

    // Register disposables
    context.subscriptions.push(
        { dispose: () => deviceManager.dispose() },
        { dispose: () => NativeFileWatcher.getInstance().dispose() },
        { dispose: () => statusBar.dispose() },
        { dispose: () => LogcatStreamer.getInstance().dispose() },
        { dispose: () => logger.dispose() }
    );

    logger.info('React Native Runner activated successfully.');
}

export function deactivate(): void {
    DeviceManager.getInstance().dispose();
    NativeFileWatcher.getInstance().dispose();
    StatusBarController.getInstance().dispose();
    Logger.getInstance().dispose();
}
