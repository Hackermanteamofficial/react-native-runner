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
exports.LogcatStreamer = void 0;
const child_process = __importStar(require("child_process"));
const vscode = __importStar(require("vscode"));
const DeviceManager_1 = require("../devices/DeviceManager");
const Logger_1 = require("../utils/Logger");
class LogcatStreamer {
    static instance;
    outputChannel;
    currentProcess = null;
    currentSerial = null;
    logger = Logger_1.Logger.getInstance();
    lastCrashNotificationTime = 0;
    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('React Native Logs');
    }
    static getInstance() {
        if (!LogcatStreamer.instance) {
            LogcatStreamer.instance = new LogcatStreamer();
        }
        return LogcatStreamer.instance;
    }
    isStreaming() {
        return this.currentProcess !== null && !this.currentProcess.killed;
    }
    getCurrentSerial() {
        return this.currentSerial;
    }
    async start(serial, deviceName, packageName) {
        this.stop();
        const adbManager = DeviceManager_1.DeviceManager.getInstance().getAdbManager();
        const adbPath = adbManager.getAdbPath();
        this.currentSerial = serial;
        this.outputChannel.show(true);
        this.outputChannel.clear();
        this.outputChannel.appendLine(`===================================================================`);
        this.outputChannel.appendLine(` [React Native Logs] Streaming started for: ${deviceName} (${serial})`);
        if (packageName) {
            this.outputChannel.appendLine(` Filter target: ${packageName}`);
        }
        this.outputChannel.appendLine(`===================================================================\n`);
        let pid;
        if (packageName) {
            pid = await adbManager.getPid(serial, packageName);
        }
        let args;
        if (pid) {
            this.outputChannel.appendLine(`[INFO] Filtering by active process PID: ${pid}\n`);
            args = ['-s', serial, 'logcat', '-v', 'time', `--pid=${pid}`];
        }
        else {
            this.outputChannel.appendLine(`[INFO] PID not active yet, streaming ReactNative / Runtime crash tags...\n`);
            args = ['-s', serial, 'logcat', '-v', 'time', 'ReactNative:V', 'ReactNativeJS:V', 'AndroidRuntime:E', 'DEBUG:F', '*:S'];
        }
        try {
            this.currentProcess = child_process.spawn(adbPath, args, {
                shell: process.platform === 'win32'
            });
            this.currentProcess.stdout?.on('data', (chunk) => {
                const text = chunk.toString();
                this.outputChannel.append(text);
                this.inspectForCrashes(text);
            });
            this.currentProcess.stderr?.on('data', (chunk) => {
                const text = chunk.toString();
                this.outputChannel.append(text);
            });
            this.currentProcess.on('exit', (code) => {
                this.outputChannel.appendLine(`\n[React Native Logs] Stream closed with exit code ${code}`);
                this.currentProcess = null;
            });
            this.currentProcess.on('error', (err) => {
                this.outputChannel.appendLine(`\n[React Native Logs] Stream error: ${err.message}`);
                this.currentProcess = null;
            });
            this.logger.info(`Logcat stream initiated for ${serial}.`);
        }
        catch (e) {
            this.logger.error(`Failed to spawn logcat: ${e.message}`);
            this.outputChannel.appendLine(`Failed to start logcat: ${e.message}`);
        }
    }
    stop() {
        if (this.currentProcess) {
            try {
                this.currentProcess.kill('SIGTERM');
            }
            catch {
                // Ignore kill errors
            }
            this.currentProcess = null;
            this.currentSerial = null;
            this.outputChannel.appendLine('\n[React Native Logs] Stream stopped by user.');
        }
    }
    show() {
        this.outputChannel.show(true);
    }
    inspectForCrashes(chunk) {
        const isFatal = /FATAL EXCEPTION|AndroidRuntime:\s*FATAL|ReactAndroid:\s*Unhandled JS Exception/i.test(chunk);
        if (!isFatal) {
            return;
        }
        const now = Date.now();
        // Debounce alert to at most once every 10 seconds
        if (now - this.lastCrashNotificationTime < 10000) {
            return;
        }
        this.lastCrashNotificationTime = now;
        vscode.window.showErrorMessage('React Native application encountered a fatal crash or unhandled exception!', 'View Crash Logs').then(selection => {
            if (selection === 'View Crash Logs') {
                this.outputChannel.show();
            }
        });
    }
    dispose() {
        this.stop();
        this.outputChannel.dispose();
    }
}
exports.LogcatStreamer = LogcatStreamer;
//# sourceMappingURL=LogcatStreamer.js.map