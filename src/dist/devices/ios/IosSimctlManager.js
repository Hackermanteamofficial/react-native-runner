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
exports.IosSimctlManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ProcessRunner_1 = require("../../utils/ProcessRunner");
const Logger_1 = require("../../utils/Logger");
class IosSimctlManager {
    static instance;
    logger = Logger_1.Logger.getInstance();
    constructor() { }
    static getInstance() {
        if (!IosSimctlManager.instance) {
            IosSimctlManager.instance = new IosSimctlManager();
        }
        return IosSimctlManager.instance;
    }
    isSupported() {
        return process.platform === 'darwin';
    }
    async getSimulators() {
        if (!this.isSupported()) {
            return [];
        }
        try {
            const res = await ProcessRunner_1.ProcessRunner.run('xcrun', ['simctl', 'list', 'devices', 'available', '--json'], { timeoutMs: 5000 });
            if (res.exitCode !== 0) {
                this.logger.debug(`simctl list devices failed with code ${res.exitCode}`);
                return [];
            }
            const parsed = JSON.parse(res.stdout);
            const deviceMap = parsed.devices || {};
            const devices = [];
            for (const runtime of Object.keys(deviceMap)) {
                // Focus on iOS runtime devices (filter out watchOS / tvOS if needed)
                if (!runtime.toLowerCase().includes('ios')) {
                    continue;
                }
                for (const d of deviceMap[runtime]) {
                    if (!d.isAvailable) {
                        continue;
                    }
                    const isOnline = d.state === 'Booted';
                    devices.push({
                        id: `ios:${d.udid}`,
                        name: `${d.name} (Simulator)`,
                        type: 'emulator',
                        state: isOnline ? 'online' : 'offline',
                        platform: 'ios',
                        isPhysical: false,
                        isEmulator: true,
                        simulatorId: d.udid,
                        serial: d.udid
                    });
                }
            }
            return devices;
        }
        catch (e) {
            this.logger.debug(`Could not retrieve iOS simulators: ${e}`);
            return [];
        }
    }
    async bootSimulator(udid) {
        if (!this.isSupported()) {
            throw new Error('iOS Simulators can only be executed on macOS with Xcode installed.');
        }
        this.logger.info(`Booting iOS simulator ${udid}...`);
        try {
            await ProcessRunner_1.ProcessRunner.run('xcrun', ['simctl', 'boot', udid], { timeoutMs: 15000 });
        }
        catch {
            // Already booted or booting
        }
        // Open macOS Simulator app focusing this UDID
        try {
            await ProcessRunner_1.ProcessRunner.run('open', ['-a', 'Simulator', '--args', '-CurrentDeviceUDID', udid], { timeoutMs: 5000 });
            return true;
        }
        catch (e) {
            this.logger.error(`Failed to open Simulator app: ${e.message}`);
            return false;
        }
    }
    async stopSimulator(udid) {
        if (!this.isSupported()) {
            return;
        }
        this.logger.info(`Shutting down iOS simulator ${udid}...`);
        await ProcessRunner_1.ProcessRunner.run('xcrun', ['simctl', 'shutdown', udid], { timeoutMs: 10000 });
    }
    async launchApp(udid, bundleId) {
        if (!this.isSupported()) {
            return;
        }
        this.logger.info(`Launching ${bundleId} on iOS simulator ${udid}...`);
        await ProcessRunner_1.ProcessRunner.run('xcrun', ['simctl', 'launch', udid, bundleId], { timeoutMs: 10000 });
    }
    async openUrl(udid, url) {
        if (!this.isSupported()) {
            return;
        }
        this.logger.info(`Opening deep link on iOS simulator: ${url}`);
        await ProcessRunner_1.ProcessRunner.run('xcrun', ['simctl', 'openurl', udid, url], { timeoutMs: 5000 });
    }
    checkCocoaPods(projectRoot) {
        const iosDir = path.join(projectRoot, 'ios');
        const podfile = path.join(iosDir, 'Podfile');
        const podfileLock = path.join(iosDir, 'Podfile.lock');
        const podsDir = path.join(iosDir, 'Pods');
        if (!fs.existsSync(podfile)) {
            return { needsPodInstall: false };
        }
        if (!fs.existsSync(podfileLock) || !fs.existsSync(podsDir)) {
            return {
                needsPodInstall: true,
                message: 'CocoaPods dependencies have not been installed. Run "cd ios && pod install".'
            };
        }
        const podfileMtime = fs.statSync(podfile).mtimeMs;
        const lockMtime = fs.statSync(podfileLock).mtimeMs;
        if (podfileMtime > lockMtime) {
            return {
                needsPodInstall: true,
                message: 'Podfile was modified after Podfile.lock. Run "cd ios && pod install".'
            };
        }
        return { needsPodInstall: false };
    }
}
exports.IosSimctlManager = IosSimctlManager;
//# sourceMappingURL=IosSimctlManager.js.map