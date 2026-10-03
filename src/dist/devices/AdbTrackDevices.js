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
exports.AdbTrackDevices = void 0;
const net = __importStar(require("net"));
const events_1 = require("events");
const DeviceParser_1 = require("./DeviceParser");
const Logger_1 = require("../utils/Logger");
const ProcessRunner_1 = require("../utils/ProcessRunner");
class AdbTrackDevices extends events_1.EventEmitter {
    socket = null;
    isTracking = false;
    buffer = Buffer.alloc(0);
    reconnectTimeout = null;
    adbPort = 5037;
    adbPath = 'adb';
    logger = Logger_1.Logger.getInstance();
    constructor(adbPort = 5037, adbPath = 'adb') {
        super();
        this.adbPort = adbPort;
        this.adbPath = adbPath;
    }
    updateConfig(adbPort, adbPath) {
        this.adbPort = adbPort;
        this.adbPath = adbPath;
    }
    start() {
        if (this.isTracking) {
            return;
        }
        this.isTracking = true;
        this.connect();
    }
    stop() {
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
    connect() {
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
        this.socket.on('data', (data) => {
            this.buffer = Buffer.concat([this.buffer, data]);
            // First 4 bytes response is "OKAY" or "FAIL"
            if (!acknowledged) {
                if (this.buffer.length >= 4) {
                    const status = this.buffer.slice(0, 4).toString('ascii');
                    if (status === 'OKAY') {
                        acknowledged = true;
                        this.buffer = this.buffer.slice(4);
                        this.logger.debug('ADB host:track-devices protocol handshake OKAY');
                    }
                    else if (status === 'FAIL') {
                        const errorMsg = this.buffer.slice(4).toString('utf8');
                        this.logger.warn(`ADB host:track-devices returned FAIL: ${errorMsg}`);
                        this.socket?.destroy();
                        return;
                    }
                }
                else {
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
        this.socket.on('error', async (err) => {
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
    async ensureAdbServerRunning() {
        try {
            this.logger.info('Starting ADB daemon...');
            await ProcessRunner_1.ProcessRunner.run(this.adbPath, ['start-server'], { timeoutMs: 5000 });
        }
        catch (e) {
            this.logger.debug(`Could not start ADB server via CLI: ${e}`);
        }
    }
    handleDevicesPacket(body) {
        const lines = body.split('\n');
        const devices = [];
        for (const line of lines) {
            const parsed = DeviceParser_1.DeviceParser.parseTrackDevicesLine(line);
            if (parsed) {
                devices.push(parsed);
            }
        }
        this.emit('devicesChanged', devices);
    }
}
exports.AdbTrackDevices = AdbTrackDevices;
//# sourceMappingURL=AdbTrackDevices.js.map