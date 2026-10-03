import * as vscode from 'vscode';
import { PortHelper } from '../metro/PortHelper';
import { ConfigurationManager } from '../config/ConfigurationManager';
import { Logger } from '../utils/Logger';

export async function killPortCommand(): Promise<void> {
    const logger = Logger.getInstance();
    const config = ConfigurationManager.getInstance().getConfig();
    const defaultPort = config.metroPort || 8081;

    const input = await vscode.window.showInputBox({
        title: 'React Native Runner: Free Port / Kill Process',
        prompt: 'Enter port to inspect and free:',
        value: defaultPort.toString()
    });

    if (!input) {
        return;
    }

    const port = parseInt(input.trim(), 10);
    if (isNaN(port) || port <= 0) {
        vscode.window.showErrorMessage('Invalid port number.');
        return;
    }

    const pid = await PortHelper.getPidOnPort(port);
    if (!pid) {
        vscode.window.showInformationMessage(`Port ${port} is free! No listening process found.`);
        return;
    }

    const confirm = await vscode.window.showWarningMessage(
        `Port ${port} is occupied by PID ${pid}. Terminate process?`,
        { modal: true },
        'Kill Process'
    );

    if (confirm === 'Kill Process') {
        const success = await PortHelper.killProcess(pid);
        if (success) {
            vscode.window.showInformationMessage(`Terminated process on PID ${pid}. Port ${port} is now free.`);
            logger.info(`Port ${port} freed (killed PID ${pid}).`);
        } else {
            vscode.window.showErrorMessage(`Failed to kill process PID ${pid}. It may require administrator privileges.`);
        }
    }
}
