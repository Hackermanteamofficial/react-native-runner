import * as vscode from 'vscode';
import { LogcatStreamer } from '../logging/LogcatStreamer';
import { DeviceManager } from '../devices/DeviceManager';
import { DeviceQuickPick } from '../ui/DeviceQuickPick';
import { ProjectDetector } from '../project/ProjectDetector';

export async function logcatCommand(): Promise<void> {
    const streamer = LogcatStreamer.getInstance();
    const deviceManager = DeviceManager.getInstance();

    if (streamer.isStreaming()) {
        const choice = await vscode.window.showQuickPick(
            [
                { label: '$(output) Show Log Channel', action: 'show' },
                { label: '$(sync) Restart Logcat Stream', action: 'restart' },
                { label: '$(stop) Stop Streaming', action: 'stop' }
            ],
            { title: 'React Native Runner: Logcat Telemetry' }
        );

        if (!choice) {
            return;
        }

        if (choice.action === 'show') {
            streamer.show();
            return;
        } else if (choice.action === 'stop') {
            streamer.stop();
            vscode.window.setStatusBarMessage('$(stop) Logcat streaming stopped', 3000);
            return;
        }
    }

    let device = deviceManager.getSelectedDevice();
    if (!device || device.state === 'offline' || !device.serial) {
        device = await DeviceQuickPick.show(deviceManager);
        if (!device || !device.serial) {
            return;
        }
    }

    const project = await ProjectDetector.getInstance().detect();
    await streamer.start(device.serial, device.name, project?.packageName);
    vscode.window.setStatusBarMessage(`$(output) Streaming Logcat from ${device.name}`, 3000);
}
