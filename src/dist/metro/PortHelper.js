"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PortHelper = void 0;
const ProcessRunner_1 = require("../utils/ProcessRunner");
const Logger_1 = require("../utils/Logger");
class PortHelper {
    static logger = Logger_1.Logger.getInstance();
    static async getPidOnPort(port) {
        const isWin = process.platform === 'win32';
        try {
            if (isWin) {
                // Windows netstat command
                const res = await ProcessRunner_1.ProcessRunner.run('netstat', ['-ano', '-p', 'tcp'], { timeoutMs: 3000 });
                const lines = res.stdout.split('\n');
                for (const line of lines) {
                    if (line.includes(`:${port}`) && line.includes('LISTENING')) {
                        const parts = line.trim().split(/\s+/);
                        const pid = parseInt(parts[parts.length - 1], 10);
                        if (!isNaN(pid) && pid > 0) {
                            return pid;
                        }
                    }
                }
            }
            else {
                // macOS / Linux lsof command
                const res = await ProcessRunner_1.ProcessRunner.run('lsof', ['-ti', `:${port}`], { timeoutMs: 3000 });
                const pid = parseInt(res.stdout.trim().split('\n')[0], 10);
                if (!isNaN(pid) && pid > 0) {
                    return pid;
                }
            }
        }
        catch (e) {
            this.logger.debug(`Could not inspect port ${port}: ${e}`);
        }
        return undefined;
    }
    static async killProcess(pid) {
        const isWin = process.platform === 'win32';
        this.logger.info(`Terminating process on PID ${pid}...`);
        try {
            if (isWin) {
                const res = await ProcessRunner_1.ProcessRunner.run('taskkill', ['/F', '/PID', pid.toString()], { timeoutMs: 3000 });
                return res.exitCode === 0;
            }
            else {
                const res = await ProcessRunner_1.ProcessRunner.run('kill', ['-9', pid.toString()], { timeoutMs: 3000 });
                return res.exitCode === 0;
            }
        }
        catch (e) {
            this.logger.error(`Failed to kill process PID ${pid}: ${e}`);
            return false;
        }
    }
}
exports.PortHelper = PortHelper;
//# sourceMappingURL=PortHelper.js.map