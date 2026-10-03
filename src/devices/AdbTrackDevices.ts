import * as net from 'net';
import { EventEmitter } from 'events';
import { DeviceState } from '../types/Device';
import { DeviceParser } from './DeviceParser';
import { Logger } from '../utils/Logger';
import { ProcessRunner } from '../utils/ProcessRunner';

export interface TrackedDevice {
    serial: string;
    state: DeviceState;
}

export class AdbTrackDevices extends EventEmitter {
    private socket: net.Socket | null = null;
    private isTracking: boolean = false;
    private buffer: Buffer = Buffer.alloc(0);
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private adbPort: number = 5037;
    private adbPath: string = 'adb';
    private logger = Logger.getInstance();

    constructor(adbPort: number = 5037, adbPath: string = 'adb') {
        super();
        this.adbPort = adbPort;
        this.adbPath = adbPath;
    }

    public updateConfig(adbPort: number, adbPath: string): void {
        this.adbPort = adbPort;
        this.adbPath = adbPath;
    }

    public start(): void {
        if (this.isTracking) {
            return;
        }
        this.isTracking = true;
        this.connect();
    }

    public stop(): void {
        this.isTracking = false;
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        if (this.socket) {
            this.socket.destroy();
            this.socket = null;
        }
    }

    private connect(): void {
        if (!this.isTracking) {
            return;
        }

        this.buffer = Buffer.alloc(0);
        this.socket = net.createConnection({ host: '127.0.0.1', port: this.adbPort }, () => {
            this.logger.debug(`Connected to ADB server socket on port ${this.adbPort}`);
            // Format command: 4-digit hex length + command
            const command = 'host:track-devices';
            const hexLength = command.length.toString(16).padStart(4, '0');
            this.socket?.write(`${hexLength}${command}`);
        });

        let acknowledged = false;

        this.socket.on('data', (data: Buffer) => {
            this.buffer = Buffer.concat([this.buffer, data]);

            // First 4 bytes response is "OKAY" or "FAIL"
            if (!acknowledged) {
                if (this.buffer.length >= 4) {
                    const status = this.buffer.slice(0, 4).toString('ascii');
                    if (status === 'OKAY') {
                        acknowledged = true;
                        this.buffer = this.buffer.slice(4);
                        this.logger.debug('ADB host:track-devices protocol handshake OKAY');
                    } else if (status === 'FAIL') {
                        const errorMsg = this.buffer.slice(4).toString('utf8');
                        this.logger.warn(`ADB host:track-devices returned FAIL: ${errorMsg}`);
                        this.socket?.destroy();
                        return;
                    }
                } else {
                    return;
                }
            }

            // Process streaming device list packets: 4-byte hex length followed by body
            while (this.buffer.length >= 4) {
                const lenHex = this.buffer.slice(0, 4).toString('ascii');
                const len = parseInt(lenHex, 16);

                if (isNaN(len)) {
                    // Invalid packet header, reset buffer
                    this.buffer = Buffer.alloc(0);
                    break;
                }

                if (this.buffer.length < 4 + len) {
                    // Waiting for more data
                    break;
                }

                const body = this.buffer.slice(4, 4 + len).toString('utf8');
                this.buffer = this.buffer.slice(4 + len);

                this.handleDevicesPacket(body);
            }
        });

        this.socket.on('error', async (err: any) => {
            this.logger.debug(`ADB socket error: ${err.message}`);
            if (err.code === 'ECONNREFUSED') {
                // ADB server might not be started yet
                await this.ensureAdbServerRunning();
            }
        });

        this.socket.on('close', () => {
            this.socket = null;
            if (this.isTracking) {
                this.reconnectTimeout = setTimeout(() => this.connect(), 2000);
            }
        });
    }

    private async ensureAdbServerRunning(): Promise<void> {
        try {
            this.logger.info('Starting ADB daemon...');
            await ProcessRunner.run(this.adbPath, ['start-server'], { timeoutMs: 5000 });
        } catch (e) {
            this.logger.debug(`Could not start ADB server via CLI: ${e}`);
        }
    }

    private handleDevicesPacket(body: string): void {
        const lines = body.split('\n');
        const devices: TrackedDevice[] = [];

        for (const line of lines) {
            const parsed = DeviceParser.parseTrackDevicesLine(line);
            if (parsed) {
                devices.push(parsed);
            }
        }

        this.emit('devicesChanged', devices);
    }
}
