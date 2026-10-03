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

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    const logger = Logger.getInstance();
    logger.info('Activating RN Device Runner Extension (v2)...');

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

    // 5. Register Extension Commands (Short IDs with backward-compatible aliases)
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

        // Backward compatibility aliases
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
        { dispose: () => logger.dispose() }
    );

    logger.info('RN Device Runner activated successfully.');
}

export function deactivate(): void {
    DeviceManager.getInstance().dispose();
    NativeFileWatcher.getInstance().dispose();
    StatusBarController.getInstance().dispose();
    Logger.getInstance().dispose();
}
