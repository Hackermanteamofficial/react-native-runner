import * as fs from 'fs';
import * as path from 'path';
import { Device } from '../../types/Device';
import { ProcessRunner } from '../../utils/ProcessRunner';
import { Logger } from '../../utils/Logger';

export interface RawSimctlDevice {
    udid: string;
    name: string;
    state: 'Booted' | 'Shutdown' | string;
    isAvailable: boolean;
}

export class IosSimctlManager {
    private static instance: IosSimctlManager;
    private logger = Logger.getInstance();

    private constructor() {}

    public static getInstance(): IosSimctlManager {
        if (!IosSimctlManager.instance) {
            IosSimctlManager.instance = new IosSimctlManager();
        }
        return IosSimctlManager.instance;
    }

    public isSupported(): boolean {
        return process.platform === 'darwin';
    }

    public async getSimulators(): Promise<Device[]> {
        if (!this.isSupported()) {
            return [];
        }

        try {
            const res = await ProcessRunner.run('xcrun', ['simctl', 'list', 'devices', 'available', '--json'], { timeoutMs: 5000 });
            if (res.exitCode !== 0) {
                this.logger.debug(`simctl list devices failed with code ${res.exitCode}`);
                return [];
            }

            const parsed = JSON.parse(res.stdout);
            const deviceMap: Record<string, RawSimctlDevice[]> = parsed.devices || {};
            const devices: Device[] = [];

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
        } catch (e) {
            this.logger.debug(`Could not retrieve iOS simulators: ${e}`);
            return [];
        }
    }

    public async bootSimulator(udid: string): Promise<boolean> {
        if (!this.isSupported()) {
            throw new Error('iOS Simulators can only be executed on macOS with Xcode installed.');
        }

        this.logger.info(`Booting iOS simulator ${udid}...`);
        try {
            await ProcessRunner.run('xcrun', ['simctl', 'boot', udid], { timeoutMs: 15000 });
        } catch {
            // Already booted or booting
        }

        // Open macOS Simulator app focusing this UDID
        try {
            await ProcessRunner.run('open', ['-a', 'Simulator', '--args', '-CurrentDeviceUDID', udid], { timeoutMs: 5000 });
            return true;
        } catch (e: any) {
            this.logger.error(`Failed to open Simulator app: ${e.message}`);
            return false;
        }
    }

    public async stopSimulator(udid: string): Promise<void> {
        if (!this.isSupported()) {
            return;
        }

        this.logger.info(`Shutting down iOS simulator ${udid}...`);
        await ProcessRunner.run('xcrun', ['simctl', 'shutdown', udid], { timeoutMs: 10000 });
    }

    public async launchApp(udid: string, bundleId: string): Promise<void> {
        if (!this.isSupported()) {
            return;
        }

        this.logger.info(`Launching ${bundleId} on iOS simulator ${udid}...`);
        await ProcessRunner.run('xcrun', ['simctl', 'launch', udid, bundleId], { timeoutMs: 10000 });
    }

    public async openUrl(udid: string, url: string): Promise<void> {
        if (!this.isSupported()) {
            return;
        }

        this.logger.info(`Opening deep link on iOS simulator: ${url}`);
        await ProcessRunner.run('xcrun', ['simctl', 'openurl', udid, url], { timeoutMs: 5000 });
    }

    public checkCocoaPods(projectRoot: string): { needsPodInstall: boolean; message?: string } {
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
