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
exports.debugCommand = debugCommand;
const http = __importStar(require("http"));
const vscode = __importStar(require("vscode"));
const MetroManager_1 = require("../metro/MetroManager");
const ConfigurationManager_1 = require("../config/ConfigurationManager");
const Logger_1 = require("../utils/Logger");
function fetchJson(url, timeoutMs = 3000) {
    return new Promise((resolve, reject) => {
        const req = http.get(url, { timeout: timeoutMs }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed);
                }
                catch (e) {
                    reject(new Error(`Failed to parse response from ${url}: ${e}`));
                }
            });
        });
        req.on('error', (err) => reject(err));
        req.on('timeout', () => {
            req.destroy();
            reject(new Error(`Request to ${url} timed out.`));
        });
    });
}
async function debugCommand() {
    const logger = Logger_1.Logger.getInstance();
    const metroManager = MetroManager_1.MetroManager.getInstance();
    const config = ConfigurationManager_1.ConfigurationManager.getInstance().getConfig();
    const port = config.metroPort || 8081;
    // 1. Verify Metro dev server is running
    const isRunning = await metroManager.isMetroRunning(port);
    if (!isRunning) {
        const choice = await vscode.window.showWarningMessage(`Metro bundler is not active on port ${port}. Please run the app or start Metro before attaching debugger.`, 'Run App Now');
        if (choice === 'Run App Now') {
            vscode.commands.executeCommand('rn-run');
        }
        return;
    }
    try {
        // 2. Query Metro's Chrome DevTools Protocol targets
        let targets = [];
        try {
            targets = await fetchJson(`http://127.0.0.1:${port}/json/list`);
        }
        catch {
            targets = await fetchJson(`http://127.0.0.1:${port}/json`);
        }
        const validTargets = targets.filter(t => !!t.webSocketDebuggerUrl);
        if (validTargets.length === 0) {
            const action = await vscode.window.showWarningMessage('No Hermes debug sessions found on Metro. Ensure your React Native app is open on the target device.', 'Open Dev Menu', 'Reload App');
            if (action === 'Open Dev Menu') {
                vscode.commands.executeCommand('rn-dev-menu');
            }
            else if (action === 'Reload App') {
                vscode.commands.executeCommand('rn-reload');
            }
            return;
        }
        // 3. Resolve target Hermes session
        let selectedTarget = validTargets[0];
        if (validTargets.length > 1) {
            const picked = await vscode.window.showQuickPick(validTargets.map(t => ({
                label: `$(bug) ${t.title || 'React Native App'}`,
                description: t.description || t.id,
                target: t
            })), { title: 'React Native Runner: Select Hermes Debug Session' });
            if (!picked) {
                return;
            }
            selectedTarget = picked.target;
        }
        logger.info(`Attaching VS Code debugger to Hermes WebSocket: ${selectedTarget.webSocketDebuggerUrl}`);
        // 4. Attach VS Code's JavaScript/Node debugger to Hermes CDP WebSocket
        const debugConfig = {
            type: 'pwa-node',
            request: 'attach',
            name: `Hermes: ${selectedTarget.title || 'React Native'}`,
            websocketAddress: selectedTarget.webSocketDebuggerUrl,
            restart: false,
            sourceMaps: true
        };
        const success = await vscode.debug.startDebugging(undefined, debugConfig);
        if (success) {
            vscode.window.setStatusBarMessage('$(bug) Attached to Hermes Debugger', 4000);
            vscode.window.showInformationMessage(`Attached debugger to Hermes (${selectedTarget.title || 'React Native'}). You can now set breakpoints in VS Code!`);
        }
        else {
            vscode.window.showErrorMessage('Failed to start debugging session. Ensure the built-in JavaScript debugger is active.');
        }
    }
    catch (e) {
        logger.error(`Hermes debug attach failed: ${e.message}`);
        vscode.window.showErrorMessage(`Debug attach error: ${e.message}`);
    }
}
//# sourceMappingURL=debugCommand.js.map