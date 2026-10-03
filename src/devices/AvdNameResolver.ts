import { AdbManager } from './AdbManager';
import { Logger } from '../utils/Logger';

export class AvdNameResolver {
    private adbManager: AdbManager;
    private logger = Logger.getInstance();
    private cache = new Map<string, string>(); // serial -> avdName

    constructor(adbManager: AdbManager) {
        this.adbManager = adbManager;
    }

    public async resolveAvdName(serial: string): Promise<string | undefined> {
        if (!serial.startsWith('emulator-')) {
            return undefined;
        }

        if (this.cache.has(serial)) {
            return this.cache.get(serial);
        }

        try {
            const avdName = await this.adbManager.getAvdNameForSerial(serial);
            if (avdName) {
                this.cache.set(serial, avdName);
                this.logger.debug(`Resolved emulator serial ${serial} -> AVD name: ${avdName}`);
                return avdName;
            }
        } catch (e) {
            this.logger.debug(`Could not resolve AVD name for ${serial}: ${e}`);
        }

        return undefined;
    }

    public async resolveAll(serials: string[]): Promise<Map<string, string>> {
        const result = new Map<string, string>();
        const emulatorSerials = serials.filter(s => s.startsWith('emulator-'));

        await Promise.all(
            emulatorSerials.map(async serial => {
                const name = await this.resolveAvdName(serial);
                if (name) {
                    result.set(serial, name);
                }
            })
        );

        return result;
    }

    public invalidate(serial?: string): void {
        if (serial) {
            this.cache.delete(serial);
        } else {
            this.cache.clear();
        }
    }
}
