import { Device } from '../types/Device';
import { EventEmitter } from 'events';
import { ConfigurationManager } from '../config/ConfigurationManager';
import { Logger } from '../utils/Logger';

export class DeviceStateStore extends EventEmitter {
    private static instance: DeviceStateStore;
    private selectedDevice: Device | undefined;
    private logger = Logger.getInstance();

    private constructor() {
        super();
    }

    public static getInstance(): DeviceStateStore {
        if (!DeviceStateStore.instance) {
            DeviceStateStore.instance = new DeviceStateStore();
        }
        return DeviceStateStore.instance;
    }

    public getSelectedDevice(): Device | undefined {
        return this.selectedDevice;
    }

    public async setSelectedDevice(device: Device | undefined, persist: boolean = true): Promise<void> {
        this.selectedDevice = device;
        this.logger.info(`Selected device updated to: ${device ? `${device.name} (${device.id})` : 'None'}`);

        if (persist && device) {
            await ConfigurationManager.getInstance().updatePreferredDevice(device.id);
        }

        this.emit('selectedDeviceChanged', this.selectedDevice);
    }
}
