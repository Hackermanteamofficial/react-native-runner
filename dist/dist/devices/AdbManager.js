"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdbManager = void 0;
const ProcessRunner_1 = require("../utils/ProcessRunner");
const DeviceParser_1 = require("./DeviceParser");
const Logger_1 = require("../utils/Logger");
class AdbManager {
    adbPath;
    logger = Logger_1.Logger.getInstance();
    constructor(adbPath = 'adb') {
        this.adbPath = adbPath;
    }
    updateAdbPath(path) {
        this.adbPath = path;
    }
    getAdbPath() {
        return this.adbPath;
    }
    async execute(args, options = {}) {
        const result = await ProcessRunner_1.ProcessRunner.run(this.adbPath, args, options);
        if (result.exitCode !== 0) {
            throw new Error(`ADB command failed (exit code ${result.exitCode}): adb ${args.join(' ')}\n${result.stderr || result.stdout}`);
        }
        return result.stdout;
    }
    async getDevicesDetailed() {
        try {
            const output = await this.execute(['devices', '-l'], { timeoutMs: 5000 });
            return DeviceParser_1.DeviceParser.parseAdbDevicesOutput(output);
        }
        catch (e) {
            this.logger.warn(`Failed to get ADB devices: ${e}`);
            return [];
        }
    }
    async shell(serial, command, timeoutMs = 10000) {
        return this.execute(['-s', serial, 'shell', command], { timeoutMs });
    }
    async getProp(serial, prop) {
        try {
            const out = await this.shell(serial, `getprop ${prop}`, 3000);
            return out.trim();
        }
        catch {
            return '';
        }
    }
    async waitForDevice(serial, timeoutMs = 30000) {
        try {
            await this.execute(['-s', serial, 'wait-for-device'], { timeoutMs });
            return true;
        }
        catch (e) {
            this.logger.warn(`Wait for device ${serial} timed out or failed: ${e}`);
            return false;
        }
    }
    async reversePort(serial, devicePort = 8081, hostPort = 8081) {
        this.logger.info(`Forwarding device port: adb -s ${serial} reverse tcp:${devicePort} tcp:${hostPort}`);
        await this.execute(['-s', serial, 'reverse', `tcp:${devicePort}`, `tcp:${hostPort}`]);
    }
    async installApk(serial, apkPath, onProgress) {
        this.logger.info(`Installing APK to ${serial}: ${apkPath}`);
        await ProcessRunner_1.ProcessRunner.run(this.adbPath, ['-s', serial, 'install', '-r', '-d', apkPath], {
            onStdout: onProgress,
            onStderr: onProgress,
            timeoutMs: 120000 // 2 minutes for large APKs
        });
    }
    async startActivity(serial, packageName, activityName = '.MainActivity') {
        const component = activityName.startsWith('.') ? `${packageName}/${activityName}` : `${packageName}/${activityName}`;
        this.logger.info(`Launching activity on ${serial}: ${component}`);
        await this.shell(serial, `am start -n "${component}" -a android.intent.action.MAIN -c android.intent.category.LAUNCHER`);
    }
    async startActivityUri(serial, uri) {
        this.logger.info(`Launching deep link on ${serial}: ${uri}`);
        await this.shell(serial, `am start -W -a android.intent.action.VIEW -d "${uri}"`);
    }
    async sendDevMenuKeyEvent(serial) {
        this.logger.info(`Opening React Native Dev Menu on ${serial}...`);
        await this.shell(serial, 'input keyevent 82');
    }
    async reloadReactNative(serial) {
        this.logger.info(`Triggering React Native Reload on ${serial}...`);
        await this.shell(serial, 'input text "RR"');
    }
    async getAvdNameForSerial(serial) {
        if (!serial.startsWith('emulator-')) {
            return undefined;
        }
        try {
            const out = await this.execute(['-s', serial, 'emu', 'avd', 'name'], { timeoutMs: 3000 });
            const lines = out.split('\n').map(l => l.trim()).filter(l => l.length > 0 && l !== 'OK');
            if (lines.length > 0) {
                return lines[0].replace(/\r/g, '');
            }
        }
        catch (e) {
            this.logger.debug(`Could not query emu avd name for ${serial}: ${e}`);
        }
        return undefined;
    }
    async getApiLevel(serial) {
        const val = await this.getProp(serial, 'ro.build.version.sdk');
        const num = parseInt(val, 10);
        return isNaN(num) ? undefined : num;
    }
    async getBatteryLevel(serial) {
        try {
            const out = await this.shell(serial, 'dumpsys battery', 3000);
            const match = out.match(/level:\s*(\d+)/i);
            if (match) {
                return parseInt(match[1], 10);
            }
        }
        catch {
            // Ignore
        }
        return undefined;
    }
    async startServer() {
        await this.execute(['start-server'], { timeoutMs: 5000 });
    }
    async killServer() {
        await this.execute(['kill-server'], { timeoutMs: 5000 });
    }
}
exports.AdbManager = AdbManager;
//# sourceMappingURL=AdbManager.js.map