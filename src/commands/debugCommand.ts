import * as http from 'http';
import * as vscode from 'vscode';
import { MetroManager } from '../metro/MetroManager';
import { ConfigurationManager } from '../config/ConfigurationManager';
import { Logger } from '../utils/Logger';

interface HermesTarget {
    id: string;
    title: string;
    description?: string;
    type?: string;
    webSocketDebuggerUrl: string;
    devtoolsFrontendUrl?: string;
}

function fetchJson<T>(url: string, timeoutMs: number = 3000): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const req = http.get(url, { timeout: timeoutMs }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed);
                } catch (e) {
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

export async function debugCommand(): Promise<void> {
    const logger = Logger.getInstance();
    const metroManager = MetroManager.getInstance();
    const config = ConfigurationManager.getInstance().getConfig();
    const port = config.metroPort || 8081;

    // 1. Verify Metro dev server is running
    const isRunning = await metroManager.isMetroRunning(port);
    if (!isRunning) {
        const choice = await vscode.window.showWarningMessage(
            `Metro bundler is not active on port ${port}. Please run the app or start Metro before attaching debugger.`,
            'Run App Now'
        );
        if (choice === 'Run App Now') {
            vscode.commands.executeCommand('rn-run');
        }
        return;
    }

    try {
        // 2. Query Metro's Chrome DevTools Protocol targets
        let targets: HermesTarget[] = [];
        try {
            targets = await fetchJson<HermesTarget[]>(`http://127.0.0.1:${port}/json/list`);
        } catch {
            targets = await fetchJson<HermesTarget[]>(`http://127.0.0.1:${port}/json`);
        }

        const validTargets = targets.filter(t => !!t.webSocketDebuggerUrl);

        if (validTargets.length === 0) {
            const action = await vscode.window.showWarningMessage(
                'No Hermes debug sessions found on Metro. Ensure your React Native app is open on the target device.',
                'Open Dev Menu',
                'Reload App'
            );
            if (action === 'Open Dev Menu') {
                vscode.commands.executeCommand('rn-dev-menu');
            } else if (action === 'Reload App') {
                vscode.commands.executeCommand('rn-reload');
            }
            return;
        }

        // 3. Resolve target Hermes session
        let selectedTarget = validTargets[0];
        if (validTargets.length > 1) {
            const picked = await vscode.window.showQuickPick(
                validTargets.map(t => ({
                    label: `$(bug) ${t.title || 'React Native App'}`,
                    description: t.description || t.id,
                    target: t
                })),
                { title: 'React Native Runner: Select Hermes Debug Session' }
            );

            if (!picked) {
                return;
            }
            selectedTarget = picked.target;
        }

        logger.info(`Attaching VS Code debugger to Hermes WebSocket: ${selectedTarget.webSocketDebuggerUrl}`);

        // 4. Attach VS Code's JavaScript/Node debugger to Hermes CDP WebSocket
        const debugConfig: vscode.DebugConfiguration = {
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
        } else {
            vscode.window.showErrorMessage('Failed to start debugging session. Ensure the built-in JavaScript debugger is active.');
        }
    } catch (e: any) {
        logger.error(`Hermes debug attach failed: ${e.message}`);
        vscode.window.showErrorMessage(`Debug attach error: ${e.message}`);
    }
}
