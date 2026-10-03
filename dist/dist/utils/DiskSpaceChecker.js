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
exports.DiskSpaceChecker = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ProcessRunner_1 = require("./ProcessRunner");
const Logger_1 = require("./Logger");
class DiskSpaceChecker {
    static logger = Logger_1.Logger.getInstance();
    static async check(targetPath, thresholdGb = 5) {
        try {
            // First attempt: Node.js fs.statfs (Node 18.15.0+)
            if (typeof fs.statfs === 'function') {
                const stats = await new Promise((resolve, reject) => {
                    fs.statfs(targetPath, (err, res) => {
                        if (err) {
                            reject(err);
                        }
                        else {
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
        }
        catch (e) {
            this.logger.debug(`fs.statfs failed, falling back to OS command: ${e}`);
        }
        // Fallback for Windows
        if (process.platform === 'win32') {
            try {
                const driveLetter = path.resolve(targetPath).substring(0, 1).toUpperCase();
                const cmd = `powershell -NoProfile -Command "(Get-PSDrive ${driveLetter}).Free / 1GB; (Get-PSDrive ${driveLetter}).Used / 1GB"`;
                const res = await ProcessRunner_1.ProcessRunner.exec(cmd);
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
            }
            catch (err) {
                this.logger.debug(`PowerShell disk check failed: ${err}`);
            }
        }
        else {
            // Fallback for macOS / Linux
            try {
                const res = await ProcessRunner_1.ProcessRunner.exec(`df -k "${targetPath}"`);
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
            }
            catch (err) {
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
exports.DiskSpaceChecker = DiskSpaceChecker;
//# sourceMappingURL=DiskSpaceChecker.js.map