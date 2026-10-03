import * as http from 'http';
import * as vscode from 'vscode';
import { PortHelper } from './PortHelper';
import { Logger } from '../utils/Logger';
import { ProjectInfo } from '../types/Project';

export class MetroManager {
    private static instance: MetroManager;
    private terminal: vscode.Terminal | null = null;
    private logger = Logger.getInstance();

    private constructor() {}

    public static getInstance(): MetroManager {
        if (!MetroManager.instance) {
            MetroManager.instance = new MetroManager();
        }
        return MetroManager.instance;
    }

    public async isMetroRunning(port: number = 8081): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            const req = http.get(`http://127.0.0.1:${port}/status`, { timeout: 1500 }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    resolve(data.includes('packager-status:running'));
                });
            });

            req.on('error', () => {
                resolve(false);
            });

            req.on('timeout', () => {
                req.destroy();
                resolve(false);
            });
        });
    }

    public async ensureMetroRunning(project: ProjectInfo, port: number = 8081): Promise<boolean> {
        const isRunning = await this.isMetroRunning(port);
        if (isRunning) {
            this.logger.info(`Metro bundler is already running on port ${port}.`);
            return true;
        }

        // Check if port is locked by a zombie process not responding to /status
        const pid = await PortHelper.getPidOnPort(port);
        if (pid) {
            this.logger.warn(`Port ${port} is occupied by PID ${pid} but not responding to Metro status.`);
            const choice = await vscode.window.showWarningMessage(
                `Port ${port} is occupied by an external process (PID ${pid}). Terminate it to start Metro?`,
                'Kill & Start Metro',
                'Cancel'
            );
            if (choice === 'Kill & Start Metro') {
                await PortHelper.killProcess(pid);
                await new Promise(r => setTimeout(r, 1000));
            } else {
                return false;
            }
        }

        this.logger.info(`Starting Metro bundler on port ${port}...`);
        this.startMetroTerminal(project, port);

        // Wait up to 30 seconds for Metro /status to become available
        const startTime = Date.now();
        const timeoutMs = 30000;

        while (Date.now() - startTime < timeoutMs) {
            await new Promise(r => setTimeout(r, 1500));
            if (await this.isMetroRunning(port)) {
                this.logger.info(`Metro bundler is now ready on port ${port}!`);
                return true;
            }
        }

        this.logger.warn(`Metro did not report running status within ${Math.round(timeoutMs / 1000)}s.`);
        return false;
    }

    public startMetroTerminal(project: ProjectInfo, port: number = 8081, resetCache: boolean = false): void {
        // Find existing terminal if open
        const existingTerminal = vscode.window.terminals.find(t => t.name === 'Metro Bundler');
        if (existingTerminal && !resetCache) {
            this.terminal = existingTerminal;
            this.terminal.show(true);
            return;
        }

        if (existingTerminal) {
            existingTerminal.dispose();
        }

        this.terminal = vscode.window.createTerminal({
            name: 'Metro Bundler',
            cwd: project.rootPath
        });

        const resetFlag = project.isExpo ? '-c' : '--reset-cache';
        const baseCommand = project.isExpo
            ? `npx expo start --port ${port}`
            : `npx react-native start --port ${port}`;

        const command = resetCache ? `${baseCommand} ${resetFlag}` : baseCommand;

        this.logger.info(`Launching Metro terminal: ${command}`);
        this.terminal.sendText(command);
        this.terminal.show(true);
    }

    public restartWithCleanCache(project: ProjectInfo, port: number = 8081): void {
        this.logger.info('Restarting Metro bundler with clean cache...');
        this.startMetroTerminal(project, port, true);
    }

    public async triggerReload(port: number = 8081): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            const req = http.request({
                hostname: '127.0.0.1',
                port,
                path: '/reload',
                method: 'POST',
                timeout: 2000
            }, (res) => {
                resolve(res.statusCode === 200);
            });

            req.on('error', () => resolve(false));
            req.on('timeout', () => {
                req.destroy();
                resolve(false);
            });
            req.end();
        });
    }

    public dispose(): void {
        if (this.terminal) {
            this.terminal.dispose();
            this.terminal = null;
        }
    }
}
