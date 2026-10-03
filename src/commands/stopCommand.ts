import * as vscode from 'vscode';
import { RunStateMachine } from '../state/RunStateMachine';
import { BuildStateStore } from '../build/BuildState';
import { MetroManager } from '../metro/MetroManager';
import { DeviceManager } from '../devices/DeviceManager';

export async function stopCommand(): Promise<void> {
    const stateMachine = RunStateMachine.getInstance();
    const buildStore = BuildStateStore.getInstance();
    const metroManager = MetroManager.getInstance();
    const deviceManager = DeviceManager.getInstance();

    // Cancel build if building
    if (buildStore.getIsBuilding()) {
        buildStore.cancelBuild();
    }

    const choice = await vscode.window.showQuickPick(
        [
            { label: 'Stop Application Run', action: 'app' },
            { label: 'Stop Metro Bundler Terminal', action: 'metro' },
            { label: 'Kill Running Android Emulator', action: 'emulator' },
            { label: 'Reset Runner State', action: 'reset' }
        ],
        { title: 'RN Device Runner: Stop / Terminate Options' }
    );

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
            } else {
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
