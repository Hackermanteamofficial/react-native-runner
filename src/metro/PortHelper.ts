import { ProcessRunner } from '../utils/ProcessRunner';
import { Logger } from '../utils/Logger';

export class PortHelper {
    private static logger = Logger.getInstance();

    public static async getPidOnPort(port: number): Promise<number | undefined> {
        const isWin = process.platform === 'win32';

        try {
            if (isWin) {
                // Windows netstat command
                const res = await ProcessRunner.run('netstat', ['-ano', '-p', 'tcp'], { timeoutMs: 3000 });
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
            } else {
                // macOS / Linux lsof command
                const res = await ProcessRunner.run('lsof', ['-ti', `:${port}`], { timeoutMs: 3000 });
                const pid = parseInt(res.stdout.trim().split('\n')[0], 10);
                if (!isNaN(pid) && pid > 0) {
                    return pid;
                }
            }
        } catch (e) {
            this.logger.debug(`Could not inspect port ${port}: ${e}`);
        }

        return undefined;
    }

    public static async killProcess(pid: number): Promise<boolean> {
        const isWin = process.platform === 'win32';
        this.logger.info(`Terminating process on PID ${pid}...`);

        try {
            if (isWin) {
                const res = await ProcessRunner.run('taskkill', ['/F', '/PID', pid.toString()], { timeoutMs: 3000 });
                return res.exitCode === 0;
            } else {
                const res = await ProcessRunner.run('kill', ['-9', pid.toString()], { timeoutMs: 3000 });
                return res.exitCode === 0;
            }
        } catch (e) {
            this.logger.error(`Failed to kill process PID ${pid}: ${e}`);
            return false;
        }
    }
}
