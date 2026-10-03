"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceStateStore = void 0;
const events_1 = require("events");
const ConfigurationManager_1 = require("../config/ConfigurationManager");
const Logger_1 = require("../utils/Logger");
class DeviceStateStore extends events_1.EventEmitter {
    static instance;
    selectedDevice;
    logger = Logger_1.Logger.getInstance();
    constructor() {
        super();
    }
    static getInstance() {
        if (!DeviceStateStore.instance) {
            DeviceStateStore.instance = new DeviceStateStore();
        }
        return DeviceStateStore.instance;
    }
    getSelectedDevice() {
        return this.selectedDevice;
    }
    async setSelectedDevice(device, persist = true) {
        this.selectedDevice = device;
        this.logger.info(`Selected device updated to: ${device ? `${device.name} (${device.id})` : 'None'}`);
        if (persist && device) {
            await ConfigurationManager_1.ConfigurationManager.getInstance().updatePreferredDevice(device.id);
        }
        this.emit('selectedDeviceChanged', this.selectedDevice);
    }
}
exports.DeviceStateStore = DeviceStateStore;
//# sourceMappingURL=DeviceState.js.map