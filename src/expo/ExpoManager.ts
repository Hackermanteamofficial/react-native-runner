import { ProjectInfo } from '../types/Project';
import { AdbManager } from '../devices/AdbManager';
import { Logger } from '../utils/Logger';

export class ExpoManager {
    private static instance: ExpoManager;
    private logger = Logger.getInstance();

    private constructor() {}

    public static getInstance(): ExpoManager {
        if (!ExpoManager.instance) {
            ExpoManager.instance = new ExpoManager();
        }
        return ExpoManager.instance;
    }

    public async launchApp(
        project: ProjectInfo,
        serial: string,
        adbManager: AdbManager,
        metroPort: number = 8081
    ): Promise<void> {
        // Forward port 8081 from device to host
        await adbManager.reversePort(serial, metroPort, metroPort);

        if (project.isExpoDevClient && project.appScheme) {
            // Expo Dev Client deep link
            const encodedUrl = encodeURIComponent(`http://127.0.0.1:${metroPort}`);
            const devClientUri = `${project.appScheme}://expo-development-client/?url=${encodedUrl}`;
            this.logger.info(`Launching via Expo Dev Client deep link: ${devClientUri}`);
            try {
                await adbManager.startActivityUri(serial, devClientUri);
                return;
            } catch (e) {
                this.logger.warn(`Deep link launch failed, falling back to package intent: ${e}`);
            }
        }

        if (project.packageName) {
            this.logger.info(`Launching Android package: ${project.packageName}`);
            await adbManager.startActivity(serial, project.packageName, '.MainActivity');
        } else if (project.isExpo && !project.hasAndroid) {
            // Managed Expo Go fallback
            this.logger.info(`Launching Expo Go on device ${serial}...`);
            const expoGoUri = `exp://127.0.0.1:${metroPort}`;
            await adbManager.startActivityUri(serial, expoGoUri);
        } else {
            throw new Error('Cannot determine how to launch app: No packageName or Expo scheme detected.');
        }
    }
}
