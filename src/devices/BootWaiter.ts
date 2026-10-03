import * as vscode from 'vscode';
import { AdbManager } from './AdbManager';
import { Logger } from '../utils/Logger';

export interface BootWaitOptions {
    timeoutMs?: number;
    intervalMs?: number;
    cancellationToken?: vscode.CancellationToken;
    onProgress?: (elapsedSeconds: number, status: string) => void;
}

export class BootWaiter {
    private adbManager: AdbManager;
    private logger = Logger.getInstance();

    constructor(adbManager: AdbManager) {
        this.adbManager = adbManager;
    }

    public async waitForBoot(serial: string, options: BootWaitOptions = {}): Promise<boolean> {
        const timeoutMs = options.timeoutMs ?? 90000; // 90 seconds
        const intervalMs = options.intervalMs ?? 1500;
        const startTime = Date.now();

        this.logger.info(`Waiting for device ${serial} to boot (timeout: ${Math.round(timeoutMs / 1000)}s)...`);
        options.onProgress?.(0, 'Waiting for ADB connection...');

        // 1. Wait for ADB device node to appear
        const connected = await this.adbManager.waitForDevice(serial, Math.min(timeoutMs, 30000));
        if (!connected) {
            throw new Error(`Device ${serial} did not become available to ADB within timeout.`);
        }

        options.onProgress?.(Math.round((Date.now() - startTime) / 1000), 'Device detected, waiting for system boot...');

        // 2. Poll sys.boot_completed
        while (Date.now() - startTime < timeoutMs) {
            if (options.cancellationToken?.isCancellationRequested) {
                this.logger.info(`Boot wait cancelled for ${serial}.`);
                return false;
            }

            try {
                const bootCompleted = await this.adbManager.getProp(serial, 'sys.boot_completed');
                if (bootCompleted === '1') {
                    const elapsed = Math.round((Date.now() - startTime) / 1000);
                    this.logger.info(`Device ${serial} boot completed in ${elapsed}s!`);
                    options.onProgress?.(elapsed, 'Boot completed!');
                    return true;
                }
            } catch {
                // Device might still be initializing ADB daemon
            }

            const elapsedSec = Math.round((Date.now() - startTime) / 1000);
            options.onProgress?.(elapsedSec, `Booting (${elapsedSec}s elapsed)...`);

            await new Promise(resolve => setTimeout(resolve, intervalMs));
        }

        throw new Error(`Timed out waiting for device ${serial} to boot completed after ${Math.round(timeoutMs / 1000)}s.`);
    }
}
