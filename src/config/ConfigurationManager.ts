import * as vscode from 'vscode';

export interface ExtensionConfig {
    androidSdkPath: string;
    adbPath: string;
    emulatorPath: string;
    metroPort: number;
    buildFlavor: string;
    autoStartMetro: boolean;
    warnLowDiskSpace: boolean;
    diskSpaceThresholdGb: number;
    wirelessAdbDefaultPort: number;
    preferredDeviceId: string;
}

export class ConfigurationManager {
    private static instance: ConfigurationManager;
    private readonly section = 'rnDeviceRunner';

    private constructor() {}

    public static getInstance(): ConfigurationManager {
        if (!ConfigurationManager.instance) {
            ConfigurationManager.instance = new ConfigurationManager();
        }
        return ConfigurationManager.instance;
    }

    public getConfig(): ExtensionConfig {
        const config = vscode.workspace.getConfiguration(this.section);

        return {
            androidSdkPath: config.get<string>('androidSdkPath', ''),
            adbPath: config.get<string>('adbPath', ''),
            emulatorPath: config.get<string>('emulatorPath', ''),
            metroPort: config.get<number>('metroPort', 8081),
            buildFlavor: config.get<string>('buildFlavor', 'debug'),
            autoStartMetro: config.get<boolean>('autoStartMetro', true),
            warnLowDiskSpace: config.get<boolean>('warnLowDiskSpace', true),
            diskSpaceThresholdGb: config.get<number>('diskSpaceThresholdGb', 5),
            wirelessAdbDefaultPort: config.get<number>('wirelessAdbDefaultPort', 5555),
            preferredDeviceId: config.get<string>('preferredDeviceId', '')
        };
    }

    public async updatePreferredDevice(deviceId: string): Promise<void> {
        const config = vscode.workspace.getConfiguration(this.section);
        await config.update('preferredDeviceId', deviceId, vscode.ConfigurationTarget.Global);
    }

    public async updateAndroidSdkPath(sdkPath: string): Promise<void> {
        const config = vscode.workspace.getConfiguration(this.section);
        await config.update('androidSdkPath', sdkPath, vscode.ConfigurationTarget.Global);
    }

    public onDidChangeConfiguration(listener: (config: ExtensionConfig) => void): vscode.Disposable {
        return vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration(this.section)) {
                listener(this.getConfig());
            }
        });
    }
}
