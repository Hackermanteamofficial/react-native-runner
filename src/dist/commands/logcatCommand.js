"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.logcatCommand = logcatCommand;
const vscode = __importStar(require("vscode"));
const LogcatStreamer_1 = require("../logging/LogcatStreamer");
const DeviceManager_1 = require("../devices/DeviceManager");
const DeviceQuickPick_1 = require("../ui/DeviceQuickPick");
const ProjectDetector_1 = require("../project/ProjectDetector");
async function logcatCommand() {
    const streamer = LogcatStreamer_1.LogcatStreamer.getInstance();
    const deviceManager = DeviceManager_1.DeviceManager.getInstance();
    if (streamer.isStreaming()) {
        const choice = await vscode.window.showQuickPick([
            { label: '$(output) Show Log Channel', action: 'show' },
            { label: '$(sync) Restart Logcat Stream', action: 'restart' },
            { label: '$(stop) Stop Streaming', action: 'stop' }
        ], { title: 'React Native Runner: Logcat Telemetry' });
        if (!choice) {
            return;
        }
        if (choice.action === 'show') {
            streamer.show();
            return;
        }
        else if (choice.action === 'stop') {
            streamer.stop();
            vscode.window.setStatusBarMessage('$(stop) Logcat streaming stopped', 3000);
            return;
        }
    }
    let device = deviceManager.getSelectedDevice();
    if (!device || device.state === 'offline' || !device.serial) {
        device = await DeviceQuickPick_1.DeviceQuickPick.show(deviceManager);
        if (!device || !device.serial) {
            return;
        }
    }
    const project = await ProjectDetector_1.ProjectDetector.getInstance().detect();
    await streamer.start(device.serial, device.name, project?.packageName);
    vscode.window.setStatusBarMessage(`$(output) Streaming Logcat from ${device.name}`, 3000);
}
//# sourceMappingURL=logcatCommand.js.map