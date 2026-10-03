import { EventEmitter } from 'events';
import { Device } from '../types/Device';
import { AdbManager } from './AdbManager';
import { AdbTrackDevices } from './AdbTrackDevices';
import { AvdManager, InstalledAvd } from './AvdManager';
import { AvdNameResolver } from './AvdNameResolver';
import { WirelessPairing } from './WirelessPairing';
import { DeviceStateStore } from './DeviceState';
import { DeviceParser } from './DeviceParser';
import { AndroidSdkDetector } from '../utils/AndroidSdkDetector';
import { IosSimctlManager } from './ios/IosSimctlManager';
import { ConfigurationManager } from '../config/ConfigurationManager';
import { Logger } from '../utils/Logger';

export class DeviceManager extends EventEmitter {
    private static instance: DeviceManager;

    private adbManager: AdbManager;
    private adbTracker: AdbTrackDevices;
    private avdManager: AvdManager;
    private avdNameResolver: AvdNameResolver;
    private wirelessPairing: WirelessPairing;
    private deviceStateStore: DeviceStateStore;
    private logger = Logger.getInstance();

    private devices: Device[] = [];
    private installedAvds: InstalledAvd[] = [];
    private isInitialized = false;

    private constructor() {
        super();
        this.adbManager = new AdbManager();
        this.adbTracker = new AdbTrackDevices();
        this.avdManager = new AvdManager();
        this.avdNameResolver = new AvdNameResolver(this.adbManager);
        this.wirelessPairing = new WirelessPairing(this.adbManager);
        this.deviceStateStore = DeviceStateStore.getInstance();
    }

    public static getInstance(): DeviceManager {
        if (!DeviceManager.instance) {
            DeviceManager.instance = new DeviceManager();
        }
        return DeviceManager.instance;
    }

    public async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }
        this.isInitialized = true;

        await this.syncSdkPaths();

        // Listen for ADB device push events (without polling)
        this.adbTracker.on('devicesChanged', async () => {
            await this.refreshDevices();
        });

        // Start tracking
        this.adbTracker.start();

        // Initial device list fetch
        await this.refreshDevices();
    }

    public async syncSdkPaths(): Promise<void> {
        const sdkInfo = await AndroidSdkDetector.getInstance().detect();
        if (sdkInfo.adbPath) {
            this.adbManager.updateAdbPath(sdkInfo.adbPath);
            this.adbTracker.updateConfig(5037, sdkInfo.adbPath);
        }
        if (sdkInfo.emulatorPath) {
            this.avdManager.updateEmulatorPath(sdkInfo.emulatorPath);
        }
    }

    public getAdbManager(): AdbManager {
        return this.adbManager;
    }

    public getAvdManager(): AvdManager {
        return this.avdManager;
    }

    public getWirelessPairing(): WirelessPairing {
        return this.wirelessPairing;
    }

    public getDevices(): Device[] {
        return this.devices;
    }

    public getSelectedDevice(): Device | undefined {
        return this.deviceStateStore.getSelectedDevice();
    }

    public async selectDevice(device: Device | undefined): Promise<void> {
        await this.deviceStateStore.setSelectedDevice(device);
    }

    public async refreshDevices(): Promise<Device[]> {
        try {
            // 1. Get raw running devices from ADB
            const rawDevices = await this.adbManager.getDevicesDetailed();

            // 2. Resolve AVD names for running emulators
            const emulatorSerials = rawDevices.filter(d => d.serial.startsWith('emulator-')).map(d => d.serial);
            const avdMap = await this.avdNameResolver.resolveAll(emulatorSerials);

            // 3. Get installed AVDs
            this.installedAvds = await this.avdManager.getInstalledAvds();

            // 4. Construct unified device list
            const unified: Device[] = [];
            const runningAvdNames = new Set<string>();

            // Process running devices
            for (const raw of rawDevices) {
                const avdName = avdMap.get(raw.serial);
                if (avdName) {
                    runningAvdNames.add(avdName);
                }

                const device = DeviceParser.toDeviceModel(raw, avdName);

                // Try to enrich with battery & API level if online
                if (device.state === 'online') {
                    const apiLevel = await this.adbManager.getApiLevel(device.id);
                    if (apiLevel) {
                        device.apiLevel = apiLevel;
                    }
                    if (device.isPhysical) {
                        const battery = await this.adbManager.getBatteryLevel(device.id);
                        if (battery !== undefined) {
                            device.batteryLevel = battery;
                        }
                    }
                }

                unified.push(device);
            }

            // Process installed AVDs that are stopped (not in runningAvdNames)
            for (const avd of this.installedAvds) {
                if (!runningAvdNames.has(avd.name)) {
                    unified.push({
                        id: `avd:${avd.name}`,
                        name: avd.displayName,
                        type: 'emulator',
                        state: 'offline',
                        platform: 'android',
                        isPhysical: false,
                        isEmulator: true,
                        avdName: avd.name
                    });
                }
            }

            // Process iOS Simulators (if running on macOS)
            if (IosSimctlManager.getInstance().isSupported()) {
                const iosSims = await IosSimctlManager.getInstance().getSimulators();
                unified.push(...iosSims);
            }

            this.devices = unified;
            this.logger.debug(`Unified device list updated: ${unified.length} devices found (${runningAvdNames.size} running emulators, ${this.installedAvds.length} total AVDs).`);

            // Auto-select preferred device or first available
            this.updateActiveDeviceSelection();

            this.emit('devicesUpdated', this.devices);
            return this.devices;
        } catch (e) {
            this.logger.warn(`Failed to refresh devices: ${e}`);
            return this.devices;
        }
    }

    private updateActiveDeviceSelection(): void {
        const currentSelected = this.deviceStateStore.getSelectedDevice();
        const preferredId = ConfigurationManager.getInstance().getConfig().preferredDeviceId;

        // If current selection is still in list, update reference
        if (currentSelected) {
            const updated = this.devices.find(d => d.id === currentSelected.id || (d.avdName && d.avdName === currentSelected.avdName));
            if (updated) {
                this.deviceStateStore.setSelectedDevice(updated, false);
                return;
            }
        }

        // Try preferred device from config
        if (preferredId) {
            const preferred = this.devices.find(d => d.id === preferredId || d.avdName === preferredId);
            if (preferred) {
                this.deviceStateStore.setSelectedDevice(preferred, false);
                return;
            }
        }

        // Default to first online device if any, or first emulator, or first device
        const onlineDevice = this.devices.find(d => d.state === 'online' || d.state === 'ready');
        if (onlineDevice) {
            this.deviceStateStore.setSelectedDevice(onlineDevice, false);
        } else if (this.devices.length > 0) {
            this.deviceStateStore.setSelectedDevice(this.devices[0], false);
        } else {
            this.deviceStateStore.setSelectedDevice(undefined, false);
        }
    }

    public dispose(): void {
        this.adbTracker.stop();
        this.removeAllListeners();
    }
}
