import { ProcessRunner, ProcessRunOptions } from '../utils/ProcessRunner';
import { DeviceParser, ParsedRawDevice } from './DeviceParser';
import { Logger } from '../utils/Logger';

export class AdbManager {
    private adbPath: string;
    private logger = Logger.getInstance();

    constructor(adbPath: string = 'adb') {
        this.adbPath = adbPath;
    }

    public updateAdbPath(path: string): void {
        this.adbPath = path;
    }

    public getAdbPath(): string {
        return this.adbPath;
    }

    public async execute(args: string[], options: ProcessRunOptions = {}): Promise<string> {
        const result = await ProcessRunner.run(this.adbPath, args, options);
        if (result.exitCode !== 0) {
            throw new Error(`ADB command failed (exit code ${result.exitCode}): adb ${args.join(' ')}\n${result.stderr || result.stdout}`);
        }
        return result.stdout;
    }

    public async getDevicesDetailed(): Promise<ParsedRawDevice[]> {
        try {
            const output = await this.execute(['devices', '-l'], { timeoutMs: 5000 });
            return DeviceParser.parseAdbDevicesOutput(output);
        } catch (e) {
            this.logger.warn(`Failed to get ADB devices: ${e}`);
            return [];
        }
    }

    public async shell(serial: string, command: string, timeoutMs: number = 10000): Promise<string> {
        return this.execute(['-s', serial, 'shell', command], { timeoutMs });
    }

    public async getProp(serial: string, prop: string): Promise<string> {
        try {
            const out = await this.shell(serial, `getprop ${prop}`, 3000);
            return out.trim();
        } catch {
            return '';
        }
    }

    public async waitForDevice(serial: string, timeoutMs: number = 30000): Promise<boolean> {
        try {
            await this.execute(['-s', serial, 'wait-for-device'], { timeoutMs });
            return true;
        } catch (e) {
            this.logger.warn(`Wait for device ${serial} timed out or failed: ${e}`);
            return false;
        }
    }

    public async reversePort(serial: string, devicePort: number = 8081, hostPort: number = 8081): Promise<void> {
        this.logger.info(`Forwarding device port: adb -s ${serial} reverse tcp:${devicePort} tcp:${hostPort}`);
        await this.execute(['-s', serial, 'reverse', `tcp:${devicePort}`, `tcp:${hostPort}`]);
    }

    public async installApk(serial: string, apkPath: string, onProgress?: (msg: string) => void): Promise<void> {
        this.logger.info(`Installing APK to ${serial}: ${apkPath}`);
        await ProcessRunner.run(
            this.adbPath,
            ['-s', serial, 'install', '-r', '-d', apkPath],
            {
                onStdout: onProgress,
                onStderr: onProgress,
                timeoutMs: 120000 // 2 minutes for large APKs
            }
        );
    }

    public async startActivity(serial: string, packageName: string, activityName: string = '.MainActivity'): Promise<void> {
        const component = activityName.startsWith('.') ? `${packageName}/${activityName}` : `${packageName}/${activityName}`;
        this.logger.info(`Launching activity on ${serial}: ${component}`);
        await this.shell(serial, `am start -n "${component}" -a android.intent.action.MAIN -c android.intent.category.LAUNCHER`);
    }

    public async startActivityUri(serial: string, uri: string): Promise<void> {
        this.logger.info(`Launching deep link on ${serial}: ${uri}`);
        await this.shell(serial, `am start -W -a android.intent.action.VIEW -d "${uri}"`);
    }

    public async sendDevMenuKeyEvent(serial: string): Promise<void> {
        this.logger.info(`Opening React Native Dev Menu on ${serial}...`);
        await this.shell(serial, 'input keyevent 82');
    }

    public async reloadReactNative(serial: string): Promise<void> {
        this.logger.info(`Triggering React Native Reload on ${serial}...`);
        await this.shell(serial, 'input text "RR"');
    }

    public async clearAppData(serial: string, packageName: string): Promise<void> {
        this.logger.info(`Clearing app data for ${packageName} on ${serial}...`);
        await this.shell(serial, `pm clear ${packageName}`);
    }

    public async uninstallApp(serial: string, packageName: string): Promise<void> {
        this.logger.info(`Uninstalling ${packageName} from ${serial}...`);
        await this.execute(['-s', serial, 'uninstall', packageName]);
    }

    public async getPid(serial: string, packageName: string): Promise<number | undefined> {
        try {
            const out = await this.shell(serial, `pidof -s ${packageName}`, 3000);
            const pid = parseInt(out.trim(), 10);
            return isNaN(pid) ? undefined : pid;
        } catch {
            return undefined;
        }
    }

    public async takeScreenshot(serial: string, localFilePath: string): Promise<void> {
        const remoteTemp = '/sdcard/rnr_temp_screenshot.png';
        this.logger.info(`Capturing device screenshot on ${serial}...`);
        await this.shell(serial, `screencap -p ${remoteTemp}`);
        await this.execute(['-s', serial, 'pull', remoteTemp, localFilePath]);
        await this.shell(serial, `rm ${remoteTemp}`).catch(() => {});
        this.logger.info(`Screenshot pulled to ${localFilePath}`);
    }

    public async getAvdNameForSerial(serial: string): Promise<string | undefined> {
        if (!serial.startsWith('emulator-')) {
            return undefined;
        }
        try {
            const out = await this.execute(['-s', serial, 'emu', 'avd', 'name'], { timeoutMs: 3000 });
            const lines = out.split('\n').map(l => l.trim()).filter(l => l.length > 0 && l !== 'OK');
            if (lines.length > 0) {
                return lines[0].replace(/\r/g, '');
            }
        } catch (e) {
            this.logger.debug(`Could not query emu avd name for ${serial}: ${e}`);
        }
        return undefined;
    }

    public async getApiLevel(serial: string): Promise<number | undefined> {
        const val = await this.getProp(serial, 'ro.build.version.sdk');
        const num = parseInt(val, 10);
        return isNaN(num) ? undefined : num;
    }

    public async getBatteryLevel(serial: string): Promise<number | undefined> {
        try {
            const out = await this.shell(serial, 'dumpsys battery', 3000);
            const match = out.match(/level:\s*(\d+)/i);
            if (match) {
                return parseInt(match[1], 10);
            }
        } catch {
            // Ignore
        }
        return undefined;
    }

    public async startServer(): Promise<void> {
        await this.execute(['start-server'], { timeoutMs: 5000 });
    }

    public async killServer(): Promise<void> {
        await this.execute(['kill-server'], { timeoutMs: 5000 });
    }
}
