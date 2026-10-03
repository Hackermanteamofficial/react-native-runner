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
exports.ConfigurationManager = void 0;
const vscode = __importStar(require("vscode"));
class ConfigurationManager {
    static instance;
    section = 'rnDeviceRunner';
    constructor() { }
    static getInstance() {
        if (!ConfigurationManager.instance) {
            ConfigurationManager.instance = new ConfigurationManager();
        }
        return ConfigurationManager.instance;
    }
    getConfig() {
        const config = vscode.workspace.getConfiguration(this.section);
        return {
            androidSdkPath: config.get('androidSdkPath', ''),
            adbPath: config.get('adbPath', ''),
            emulatorPath: config.get('emulatorPath', ''),
            metroPort: config.get('metroPort', 8081),
            buildFlavor: config.get('buildFlavor', 'debug'),
            autoStartMetro: config.get('autoStartMetro', true),
            warnLowDiskSpace: config.get('warnLowDiskSpace', true),
            diskSpaceThresholdGb: config.get('diskSpaceThresholdGb', 5),
            wirelessAdbDefaultPort: config.get('wirelessAdbDefaultPort', 5555),
            preferredDeviceId: config.get('preferredDeviceId', '')
        };
    }
    async updatePreferredDevice(deviceId) {
        const config = vscode.workspace.getConfiguration(this.section);
        await config.update('preferredDeviceId', deviceId, vscode.ConfigurationTarget.Global);
    }
    async updateAndroidSdkPath(sdkPath) {
        const config = vscode.workspace.getConfiguration(this.section);
        await config.update('androidSdkPath', sdkPath, vscode.ConfigurationTarget.Global);
    }
    onDidChangeConfiguration(listener) {
        return vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration(this.section)) {
                listener(this.getConfig());
            }
        });
    }
}
exports.ConfigurationManager = ConfigurationManager;
//# sourceMappingURL=ConfigurationManager.js.map