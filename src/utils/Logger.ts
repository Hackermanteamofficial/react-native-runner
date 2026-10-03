import * as vscode from 'vscode';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export class Logger {
    private static instance: Logger;
    private outputChannel: vscode.OutputChannel;
    private isDebugEnabled: boolean = false;

    private constructor() {
        this.outputChannel = vscode.window.createOutputChannel('React Native Runner');
    }

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    public setDebugEnabled(enabled: boolean): void {
        this.isDebugEnabled = enabled;
    }

    private formatMessage(level: LogLevel, message: string): string {
        const time = new Date().toLocaleTimeString();
        return `[${time}] [${level}] ${message}`;
    }

    public debug(message: string): void {
        if (this.isDebugEnabled) {
            this.outputChannel.appendLine(this.formatMessage('DEBUG', message));
        }
    }

    public info(message: string): void {
        this.outputChannel.appendLine(this.formatMessage('INFO', message));
    }

    public warn(message: string): void {
        this.outputChannel.appendLine(this.formatMessage('WARN', message));
    }

    public error(message: string, error?: unknown): void {
        let fullMessage = message;
        if (error instanceof Error) {
            fullMessage += ` - ${error.message}\n${error.stack || ''}`;
        } else if (error) {
            fullMessage += ` - ${String(error)}`;
        }
        this.outputChannel.appendLine(this.formatMessage('ERROR', fullMessage));
    }

    public raw(text: string): void {
        this.outputChannel.append(text);
    }

    public rawLine(text: string): void {
        this.outputChannel.appendLine(text);
    }

    public show(preserveFocus: boolean = true): void {
        this.outputChannel.show(preserveFocus);
    }

    public clear(): void {
        this.outputChannel.clear();
    }

    public dispose(): void {
        this.outputChannel.dispose();
    }
}
