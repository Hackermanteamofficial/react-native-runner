import * as child_process from 'child_process';
import { ProcessRunner } from '../utils/ProcessRunner';
import { AdbManager } from './AdbManager';
import { Logger } from '../utils/Logger';

export interface InstalledAvd {
    name: string;
    displayName: string;
}

export class AvdManager {
    private emulatorPath: string;
    private logger = Logger.getInstance();

    constructor(emulatorPath: string = 'emulator') {
        this.emulatorPath = emulatorPath;
    }

    public updateEmulatorPath(path: string): void {
        this.emulatorPath = path;
    }

    public async getInstalledAvds(): Promise<InstalledAvd[]> {
        try {
            const res = await ProcessRunner.run(this.emulatorPath, ['-list-avds'], { timeoutMs: 8000 });
            if (res.exitCode !== 0 && !res.stdout) {
                return [];
            }

            const lines = res.stdout.split('\n');
            const avds: InstalledAvd[] = [];

            for (const line of lines) {
                const name = line.trim().replace(/\r/g, '');
                if (name && !name.startsWith('INFO') && !name.startsWith('WARNING')) {
                    avds.push({
                        name,
                        displayName: name.replace(/_/g, ' ')
                    });
                }
            }

            return avds;
        } catch (e) {
            this.logger.debug(`Failed to list AVDs with emulator -list-avds: ${e}`);
            return [];
        }
    }

    public async startEmulator(avdName: string): Promise<child_process.ChildProcess> {
        this.logger.info(`Starting Android emulator: ${avdName}...`);

        const spawnOptions: child_process.SpawnOptions = {
            detached: true,
            stdio: 'ignore'
        };

        const args = ['-avd', avdName];

        const child = child_process.spawn(this.emulatorPath, args, spawnOptions);
        child.unref();

        return child;
    }

    public async stopEmulator(serial: string, adbManager: AdbManager): Promise<void> {
        this.logger.info(`Stopping emulator ${serial}...`);
        try {
            await adbManager.execute(['-s', serial, 'emu', 'kill'], { timeoutMs: 5000 });
        } catch (e) {
            this.logger.warn(`Failed to stop emulator via emu kill: ${e}`);
        }
    }
}
