"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectDeviceCommand = selectDeviceCommand;
const DeviceManager_1 = require("../devices/DeviceManager");
const DeviceQuickPick_1 = require("../ui/DeviceQuickPick");
async function selectDeviceCommand() {
    const deviceManager = DeviceManager_1.DeviceManager.getInstance();
    await DeviceQuickPick_1.DeviceQuickPick.show(deviceManager);
}
//# sourceMappingURL=selectDeviceCommand.js.map