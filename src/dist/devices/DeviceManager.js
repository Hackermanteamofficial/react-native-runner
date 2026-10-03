"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceManager = void 0;
const events_1 = require("events");
const AdbManager_1 = require("./AdbManager");
const AdbTrackDevices_1 = require("./AdbTrackDevices");
const AvdManager_1 = require("./AvdManager");
const AvdNameResolver_1 = require("./AvdNameResolver");
const WirelessPairing_1 = require("./WirelessPairing");
const DeviceState_1 = require("./DeviceState");
const DeviceParser_1 = require("./DeviceParser");
const AndroidSdkDetector_1 = require("../utils/AndroidSdkDetector");
const ConfigurationManager_1 = require("../config/ConfigurationManager");
const Logger_1 = require("../utils/Logger");
class DeviceManager extends events_1.EventEmitter {
    static instance;
    adbManager;
    adbTracker;
    avdManager;
    avdNameResolver;
    wirelessPairing;
    deviceStateStore;
    logger = Logger_1.Logger.getInstance();
    devices = [];
    installedAvds = [];
    isInitialized = false;
    constructor() {
        super();
        this.adbManager = new AdbManager_1.AdbManager();
        this.adbTracker = new AdbTrackDevices_1.AdbTrackDevices();
        this.avdManager = new AvdManager_1.AvdManager();
        this.avdNameResolver = new AvdNameResolver_1.AvdNameResolver(this.adbManager);
        this.wirelessPairing = new WirelessPairing_1.WirelessPairing(this.adbManager);
        this.deviceStateStore = DeviceState_1.DeviceStateStore.getInstance();
    }
    static getInstance() {
        if (!DeviceManager.instance) {
            DeviceManager.instance = new DeviceManager();
        }
        return DeviceManager.instance;
    }
    async initialize() {
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
    async syncSdkPaths() {
        const sdkInfo = await AndroidSdkDetector_1.AndroidSdkDetector.getInstance().detect();
        if (sdkInfo.adbPath) {
            this.adbManager.updateAdbPath(sdkInfo.adbPath);
            this.adbTracker.updateConfig(5037, sdkInfo.adbPath);
        }
        if (sdkInfo.emulatorPath) {
            this.avdManager.updateEmulatorPath(sdkInfo.emulatorPath);
        }
    }
    getAdbManager() {
        return this.adbManager;
    }
    getAvdManager() {
        return this.avdManager;
    }
    getWirelessPairing() {
        return this.wirelessPairing;
    }
    getDevices() {
        return this.devices;
    }
    getSelectedDevice() {
        return this.deviceStateStore.getSelectedDevice();
    }
    async selectDevice(device) {
        await this.deviceStateStore.setSelectedDevice(device);
    }
    async refreshDevices() {
        try {
            // 1. Get raw running devices from ADB
            const rawDevices = await this.adbManager.getDevicesDetailed();
            // 2. Resolve AVD names for running emulators
            const emulatorSerials = rawDevices.filter(d => d.serial.startsWith('emulator-')).map(d => d.serial);
            const avdMap = await this.avdNameResolver.resolveAll(emulatorSerials);
            // 3. Get installed AVDs
            this.installedAvds = await this.avdManager.getInstalledAvds();
            // 4. Construct unified device list
            const unified = [];
            const runningAvdNames = new Set();
            // Process running devices
            for (const raw of rawDevices) {
                const avdName = avdMap.get(raw.serial);
                if (avdName) {
                    runningAvdNames.add(avdName);
                }
                const device = DeviceParser_1.DeviceParser.toDeviceModel(raw, avdName);
                // Try to enrich with battery & API level if online
                if (device.state === 'online') {
                    const apiLevel = await this.adbManager.getApiLevel(device.id);
                    if (apiLevel) {
                        device.apiLevel = apiLevel;
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
            this.devices = unified;
            this.logger.debug(`Unified device list updated: ${unified.length} devices found (${runningAvdNames.size} running emulators, ${this.installedAvds.length} total AVDs).`);
            // Auto-select preferred device or first available
            this.updateActiveDeviceSelection();
            this.emit('devicesUpdated', this.devices);
            return this.devices;
        }
        catch (e) {
            this.logger.warn(`Failed to refresh devices: ${e}`);
            return this.devices;
        }
    }
    updateActiveDeviceSelection() {
        const currentSelected = this.deviceStateStore.getSelectedDevice();
        const preferredId = ConfigurationManager_1.ConfigurationManager.getInstance().getConfig().preferredDeviceId;
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
        }
        else if (this.devices.length > 0) {
            this.deviceStateStore.setSelectedDevice(this.devices[0], false);
        }
        else {
            this.deviceStateStore.setSelectedDevice(undefined, false);
        }
    }
    dispose() {
        this.adbTracker.stop();
        this.removeAllListeners();
    }
}
exports.DeviceManager = DeviceManager;
//# sourceMappingURL=DeviceManager.js.map