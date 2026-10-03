"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AvdNameResolver = void 0;
const Logger_1 = require("../utils/Logger");
class AvdNameResolver {
    adbManager;
    logger = Logger_1.Logger.getInstance();
    cache = new Map(); // serial -> avdName
    constructor(adbManager) {
        this.adbManager = adbManager;
    }
    async resolveAvdName(serial) {
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
        }
        catch (e) {
            this.logger.debug(`Could not resolve AVD name for ${serial}: ${e}`);
        }
        return undefined;
    }
    async resolveAll(serials) {
        const result = new Map();
        const emulatorSerials = serials.filter(s => s.startsWith('emulator-'));
        await Promise.all(emulatorSerials.map(async (serial) => {
            const name = await this.resolveAvdName(serial);
            if (name) {
                result.set(serial, name);
            }
        }));
        return result;
    }
    invalidate(serial) {
        if (serial) {
            this.cache.delete(serial);
        }
        else {
            this.cache.clear();
        }
    }
}
exports.AvdNameResolver = AvdNameResolver;
//# sourceMappingURL=AvdNameResolver.js.map