import { DeviceManager } from '../devices/DeviceManager';
import { DeviceQuickPick } from '../ui/DeviceQuickPick';

export async function selectDeviceCommand(): Promise<void> {
    const deviceManager = DeviceManager.getInstance();
    await DeviceQuickPick.show(deviceManager);
}
