import * as vscode from 'vscode';
import { DeviceManager } from '../devices/DeviceManager';

export async function refreshDevicesCommand(): Promise<void> {
    const deviceManager = DeviceManager.getInstance();
    await deviceManager.syncSdkPaths();
    const devices = await deviceManager.refreshDevices();

    const running = devices.filter(d => d.state !== 'offline').length;
    vscode.window.setStatusBarMessage(`$(check) Devices refreshed: ${devices.length} found (${running} running)`, 3000);
}
