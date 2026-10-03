import * as fs from 'fs';
import * as path from 'path';
import { ProcessRunner } from './ProcessRunner';
import { Logger } from './Logger';

export interface DiskSpaceInfo {
    freeGb: number;
    totalGb: number;
    isLow: boolean;
    thresholdGb: number;
}

export class DiskSpaceChecker {
    private static logger = Logger.getInstance();

    public static async check(targetPath: string, thresholdGb: number = 5): Promise<DiskSpaceInfo> {
        try {
            // First attempt: Node.js fs.statfs (Node 18.15.0+)
            if (typeof (fs as any).statfs === 'function') {
                const stats = await new Promise<any>((resolve, reject) => {
                    (fs as any).statfs(targetPath, (err: Error | null, res: any) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(res);
                        }
                    });
                });

                if (stats && stats.bavail && stats.bsize) {
                    const freeBytes = Number(stats.bavail) * Number(stats.bsize);
                    const totalBytes = Number(stats.blocks) * Number(stats.bsize);
                    const freeGb = Math.round((freeBytes / (1024 * 1024 * 1024)) * 10) / 10;
                    const totalGb = Math.round((totalBytes / (1024 * 1024 * 1024)) * 10) / 10;

                    return {
                        freeGb,
                        totalGb,
                        isLow: freeGb < thresholdGb,
                        thresholdGb
                    };
                }
            }
        } catch (e) {
            this.logger.debug(`fs.statfs failed, falling back to OS command: ${e}`);
        }

        // Fallback for Windows
        if (process.platform === 'win32') {
            try {
                const driveLetter = path.resolve(targetPath).substring(0, 1).toUpperCase();
                const cmd = `powershell -NoProfile -Command "(Get-PSDrive ${driveLetter}).Free / 1GB; (Get-PSDrive ${driveLetter}).Used / 1GB"`;
                const res = await ProcessRunner.exec(cmd);
                if (res.exitCode === 0 && res.stdout) {
                    const lines = res.stdout.split('\n').map(l => parseFloat(l.trim())).filter(n => !isNaN(n));
                    if (lines.length >= 1) {
                        const freeGb = Math.round(lines[0] * 10) / 10;
                        const usedGb = lines.length > 1 ? lines[1] : 0;
                        const totalGb = Math.round((freeGb + usedGb) * 10) / 10;

                        return {
                            freeGb,
                            totalGb,
                            isLow: freeGb < thresholdGb,
                            thresholdGb
                        };
                    }
                }
            } catch (err) {
                this.logger.debug(`PowerShell disk check failed: ${err}`);
            }
        } else {
            // Fallback for macOS / Linux
            try {
                const res = await ProcessRunner.exec(`df -k "${targetPath}"`);
                if (res.exitCode === 0 && res.stdout) {
                    const lines = res.stdout.trim().split('\n');
                    if (lines.length >= 2) {
                        const parts = lines[1].trim().split(/\s+/);
                        // df output: Filesystem 1K-blocks Used Available Use% Mounted on
                        if (parts.length >= 4) {
                            const availableKb = parseInt(parts[3], 10);
                            const totalKb = parseInt(parts[1], 10);
                            const freeGb = Math.round((availableKb / (1024 * 1024)) * 10) / 10;
                            const totalGb = Math.round((totalKb / (1024 * 1024)) * 10) / 10;

                            return {
                                freeGb,
                                totalGb,
                                isLow: freeGb < thresholdGb,
                                thresholdGb
                            };
                        }
                    }
                }
            } catch (err) {
                this.logger.debug(`df disk check failed: ${err}`);
            }
        }

        // Default fallback if all fail
        return {
            freeGb: 999,
            totalGb: 999,
            isLow: false,
            thresholdGb
        };
    }
}
