import * as vscode from 'vscode';
import { DeviceManager } from '../devices/DeviceManager';
import { Logger } from '../utils/Logger';

export async function pairDeviceCommand(): Promise<void> {
    const deviceManager = DeviceManager.getInstance();
    const wireless = deviceManager.getWirelessPairing();
    const logger = Logger.getInstance();

    const action = await vscode.window.showQuickPick(
        [
            {
                label: '$(radio-tower) Pair New Device (Android 11+)',
                description: 'Requires Wi-Fi pairing code and port from Developer Options',
                mode: 'pair'
            },
            {
                label: '$(plug) Direct Connect (Standard port 5555)',
                description: 'Connect to already paired device at IP:5555',
                mode: 'connect'
            }
        ],
        {
            title: 'React Native Runner: Wireless ADB Setup',
            placeHolder: 'Select pairing method:'
        }
    );

    if (!action) {
        return;
    }

    if (action.mode === 'pair') {
        const pairingAddress = await vscode.window.showInputBox({
            prompt: 'Enter IP address & pairing port (from "Pair device with pairing code" on phone):',
            placeHolder: '192.168.1.100:37482',
            validateInput: val => {
                if (!/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}:[0-9]{1,5}$/.test(val.trim())) {
                    return 'Please enter a valid IP:port (e.g. 192.168.1.50:41235)';
                }
                return null;
            }
        });

        if (!pairingAddress) {
            return;
        }

        const pairingCode = await vscode.window.showInputBox({
            prompt: 'Enter 6-digit Wi-Fi pairing code:',
            placeHolder: '123456',
            validateInput: val => {
                if (!val.trim() || !/^\d{6}$/.test(val.trim())) {
                    return 'Please enter the 6-digit code shown on your phone screen.';
                }
                return null;
            }
        });

        if (!pairingCode) {
            return;
        }

        const connectPort = await vscode.window.showInputBox({
            prompt: 'Enter the main Wireless debugging port (from main Wireless debugging screen):',
            placeHolder: '5555 or dynamic port (e.g. 42351)',
            value: pairingAddress.split(':')[0] + ':5555'
        });

        if (!connectPort) {
            return;
        }

        vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `Pairing wireless device with ${pairingAddress}...`,
                cancellable: false
            },
            async () => {
                const pairResult = await wireless.pair(pairingAddress, pairingCode);
                if (!pairResult.success) {
                    vscode.window.showErrorMessage(`Wireless pairing failed: ${pairResult.message}`);
                    return;
                }

                logger.info('Pairing succeeded. Connecting to device...');
                const connectResult = await wireless.connect(connectPort);
                if (connectResult.success) {
                    await deviceManager.refreshDevices();
                    vscode.window.showInformationMessage(`Successfully connected to ${connectPort} via Wi-Fi!`);
                } else {
                    vscode.window.showWarningMessage(`Paired, but connect failed: ${connectResult.message}`);
                }
            }
        );
    } else {
        const address = await vscode.window.showInputBox({
            prompt: 'Enter device IP and port:',
            placeHolder: '192.168.1.100:5555',
            value: '192.168.1.'
        });

        if (!address) {
            return;
        }

        vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `Connecting to ${address}...`,
                cancellable: false
            },
            async () => {
                const result = await wireless.connect(address);
                if (result.success) {
                    await deviceManager.refreshDevices();
                    vscode.window.showInformationMessage(`Connected to ${address} via Wi-Fi!`);
                } else {
                    vscode.window.showErrorMessage(`Connection failed: ${result.message}`);
                }
            }
        );
    }
}
