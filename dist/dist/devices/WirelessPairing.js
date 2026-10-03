"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WirelessPairing = void 0;
const Logger_1 = require("../utils/Logger");
class WirelessPairing {
    adbManager;
    logger = Logger_1.Logger.getInstance();
    constructor(adbManager) {
        this.adbManager = adbManager;
    }
    static isValidHostPort(address) {
        // e.g. 192.168.1.100:5555 or 192.168.1.100:37482
        return /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}:[0-9]{1,5}$/.test(address.trim());
    }
    async pair(hostPort, pairingCode) {
        const trimmedAddress = hostPort.trim();
        const trimmedCode = pairingCode.trim();
        if (!WirelessPairing.isValidHostPort(trimmedAddress)) {
            return {
                success: false,
                message: `Invalid IP:port address format: "${trimmedAddress}". Expected format: 192.168.x.x:port`
            };
        }
        if (!trimmedCode) {
            return {
                success: false,
                message: 'Pairing code cannot be empty.'
            };
        }
        this.logger.info(`Pairing wireless device with ${trimmedAddress}...`);
        try {
            const output = await this.adbManager.execute(['pair', trimmedAddress, trimmedCode], { timeoutMs: 15000 });
            this.logger.info(`ADB pair result: ${output}`);
            if (output.toLowerCase().includes('successfully paired')) {
                return {
                    success: true,
                    message: output.trim()
                };
            }
            else {
                return {
                    success: false,
                    message: output.trim() || 'Pairing failed. Please verify the code and port.'
                };
            }
        }
        catch (err) {
            this.logger.error(`Pairing failed: ${err.message}`);
            return {
                success: false,
                message: err.message
            };
        }
    }
    async connect(hostPort) {
        let trimmedAddress = hostPort.trim();
        // If port omitted, default to 5555
        if (!trimmedAddress.includes(':')) {
            trimmedAddress += ':5555';
        }
        if (!WirelessPairing.isValidHostPort(trimmedAddress)) {
            return {
                success: false,
                message: `Invalid IP:port address format: "${trimmedAddress}".`
            };
        }
        this.logger.info(`Connecting to wireless ADB device at ${trimmedAddress}...`);
        try {
            const output = await this.adbManager.execute(['connect', trimmedAddress], { timeoutMs: 15000 });
            this.logger.info(`ADB connect result: ${output}`);
            if (output.toLowerCase().includes('connected to') && !output.toLowerCase().includes('unable to connect') && !output.toLowerCase().includes('failed to connect')) {
                return {
                    success: true,
                    message: output.trim()
                };
            }
            else {
                return {
                    success: false,
                    message: output.trim() || 'Connection failed.'
                };
            }
        }
        catch (err) {
            this.logger.error(`ADB connect failed: ${err.message}`);
            return {
                success: false,
                message: err.message
            };
        }
    }
    async disconnect(hostPort) {
        try {
            const args = hostPort ? ['disconnect', hostPort.trim()] : ['disconnect'];
            const output = await this.adbManager.execute(args, { timeoutMs: 5000 });
            return {
                success: true,
                message: output.trim()
            };
        }
        catch (err) {
            return {
                success: false,
                message: err.message
            };
        }
    }
}
exports.WirelessPairing = WirelessPairing;
//# sourceMappingURL=WirelessPairing.js.map