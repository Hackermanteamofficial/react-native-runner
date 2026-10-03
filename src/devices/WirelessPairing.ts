import { AdbManager } from './AdbManager';
import { Logger } from '../utils/Logger';

export interface PairingResult {
    success: boolean;
    message: string;
}

export class WirelessPairing {
    private adbManager: AdbManager;
    private logger = Logger.getInstance();

    constructor(adbManager: AdbManager) {
        this.adbManager = adbManager;
    }

    public static isValidHostPort(address: string): boolean {
        // e.g. 192.168.1.100:5555 or 192.168.1.100:37482
        return /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}:[0-9]{1,5}$/.test(address.trim());
    }

    public async pair(hostPort: string, pairingCode: string): Promise<PairingResult> {
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
            } else {
                return {
                    success: false,
                    message: output.trim() || 'Pairing failed. Please verify the code and port.'
                };
            }
        } catch (err: any) {
            this.logger.error(`Pairing failed: ${err.message}`);
            return {
                success: false,
                message: err.message
            };
        }
    }

    public async connect(hostPort: string): Promise<PairingResult> {
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
            } else {
                return {
                    success: false,
                    message: output.trim() || 'Connection failed.'
                };
            }
        } catch (err: any) {
            this.logger.error(`ADB connect failed: ${err.message}`);
            return {
                success: false,
                message: err.message
            };
        }
    }

    public async disconnect(hostPort?: string): Promise<PairingResult> {
        try {
            const args = hostPort ? ['disconnect', hostPort.trim()] : ['disconnect'];
            const output = await this.adbManager.execute(args, { timeoutMs: 5000 });
            return {
                success: true,
                message: output.trim()
            };
        } catch (err: any) {
            return {
                success: false,
                message: err.message
            };
        }
    }
}
