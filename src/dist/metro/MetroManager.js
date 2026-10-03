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
exports.MetroManager = void 0;
const http = __importStar(require("http"));
const vscode = __importStar(require("vscode"));
const PortHelper_1 = require("./PortHelper");
const Logger_1 = require("../utils/Logger");
class MetroManager {
    static instance;
    terminal = null;
    logger = Logger_1.Logger.getInstance();
    constructor() { }
    static getInstance() {
        if (!MetroManager.instance) {
            MetroManager.instance = new MetroManager();
        }
        return MetroManager.instance;
    }
    async isMetroRunning(port = 8081) {
        return new Promise((resolve) => {
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
    async ensureMetroRunning(project, port = 8081) {
        const isRunning = await this.isMetroRunning(port);
        if (isRunning) {
            this.logger.info(`Metro bundler is already running on port ${port}.`);
            return true;
        }
        // Check if port is locked by a zombie process not responding to /status
        const pid = await PortHelper_1.PortHelper.getPidOnPort(port);
        if (pid) {
            this.logger.warn(`Port ${port} is occupied by PID ${pid} but not responding to Metro status.`);
            const choice = await vscode.window.showWarningMessage(`Port ${port} is occupied by an external process (PID ${pid}). Terminate it to start Metro?`, 'Kill & Start Metro', 'Cancel');
            if (choice === 'Kill & Start Metro') {
                await PortHelper_1.PortHelper.killProcess(pid);
                await new Promise(r => setTimeout(r, 1000));
            }
            else {
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
    startMetroTerminal(project, port = 8081, resetCache = false) {
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
    restartWithCleanCache(project, port = 8081) {
        this.logger.info('Restarting Metro bundler with clean cache...');
        this.startMetroTerminal(project, port, true);
    }
    async triggerReload(port = 8081) {
        return new Promise((resolve) => {
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
    dispose() {
        if (this.terminal) {
            this.terminal.dispose();
            this.terminal = null;
        }
    }
}
exports.MetroManager = MetroManager;
//# sourceMappingURL=MetroManager.js.map