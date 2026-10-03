import * as child_process from 'child_process';
import * as vscode from 'vscode';
import { DeviceManager } from '../devices/DeviceManager';
import { Logger } from '../utils/Logger';

export class LogcatStreamer {
    private static instance: LogcatStreamer;
    private outputChannel: vscode.OutputChannel;
    private currentProcess: child_process.ChildProcess | null = null;
    private currentSerial: string | null = null;
    private logger = Logger.getInstance();
    private lastCrashNotificationTime = 0;

    private constructor() {
        this.outputChannel = vscode.window.createOutputChannel('React Native Logs');
    }

    public static getInstance(): LogcatStreamer {
        if (!LogcatStreamer.instance) {
            LogcatStreamer.instance = new LogcatStreamer();
        }
        return LogcatStreamer.instance;
    }

    public isStreaming(): boolean {
        return this.currentProcess !== null && !this.currentProcess.killed;
    }

    public getCurrentSerial(): string | null {
        return this.currentSerial;
    }

    public async start(serial: string, deviceName: string, packageName?: string): Promise<void> {
        this.stop();

        const adbManager = DeviceManager.getInstance().getAdbManager();
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

        let pid: number | undefined;
        if (packageName) {
            pid = await adbManager.getPid(serial, packageName);
        }

        let args: string[];
        if (pid) {
            this.outputChannel.appendLine(`[INFO] Filtering by active process PID: ${pid}\n`);
            args = ['-s', serial, 'logcat', '-v', 'time', `--pid=${pid}`];
        } else {
            this.outputChannel.appendLine(`[INFO] PID not active yet, streaming ReactNative / Runtime crash tags...\n`);
            args = ['-s', serial, 'logcat', '-v', 'time', 'ReactNative:V', 'ReactNativeJS:V', 'AndroidRuntime:E', 'DEBUG:F', '*:S'];
        }

        try {
            this.currentProcess = child_process.spawn(adbPath, args, {
                shell: process.platform === 'win32'
            });

            this.currentProcess.stdout?.on('data', (chunk: Buffer) => {
                const text = chunk.toString();
                this.outputChannel.append(text);
                this.inspectForCrashes(text);
            });

            this.currentProcess.stderr?.on('data', (chunk: Buffer) => {
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
        } catch (e: any) {
            this.logger.error(`Failed to spawn logcat: ${e.message}`);
            this.outputChannel.appendLine(`Failed to start logcat: ${e.message}`);
        }
    }

    public stop(): void {
        if (this.currentProcess) {
            try {
                this.currentProcess.kill('SIGTERM');
            } catch {
                // Ignore kill errors
            }
            this.currentProcess = null;
            this.currentSerial = null;
            this.outputChannel.appendLine('\n[React Native Logs] Stream stopped by user.');
        }
    }

    public show(): void {
        this.outputChannel.show(true);
    }

    private inspectForCrashes(chunk: string): void {
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

        vscode.window.showErrorMessage(
            'React Native application encountered a fatal crash or unhandled exception!',
            'View Crash Logs'
        ).then(selection => {
            if (selection === 'View Crash Logs') {
                this.outputChannel.show();
            }
        });
    }

    public dispose(): void {
        this.stop();
        this.outputChannel.dispose();
    }
}
