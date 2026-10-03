import * as fs from 'fs';
import * as path from 'path';

export interface AndroidProjectInfo {
    hasAndroid: boolean;
    androidDir?: string;
    gradlewPath?: string;
    appDir?: string;
    appBuildGradlePath?: string;
    rootBuildGradlePath?: string;
    settingsGradlePath?: string;
    defaultApkPath?: string;
}

export class AndroidProjectDetector {
    public static detect(projectRoot: string): AndroidProjectInfo {
        const androidDir = path.join(projectRoot, 'android');
        if (!fs.existsSync(androidDir)) {
            return { hasAndroid: false };
        }

        const isWin = process.platform === 'win32';
        const gradlewName = isWin ? 'gradlew.bat' : 'gradlew';
        const gradlewPath = path.join(androidDir, gradlewName);

        const appDir = path.join(androidDir, 'app');
        const appBuildGradleGroovy = path.join(appDir, 'build.gradle');
        const appBuildGradleKts = path.join(appDir, 'build.gradle.kts');
        const appBuildGradlePath = fs.existsSync(appBuildGradleGroovy)
            ? appBuildGradleGroovy
            : fs.existsSync(appBuildGradleKts)
                ? appBuildGradleKts
                : undefined;

        const rootBuildGradleGroovy = path.join(androidDir, 'build.gradle');
        const rootBuildGradleKts = path.join(androidDir, 'build.gradle.kts');
        const rootBuildGradlePath = fs.existsSync(rootBuildGradleGroovy)
            ? rootBuildGradleGroovy
            : fs.existsSync(rootBuildGradleKts)
                ? rootBuildGradleKts
                : undefined;

        const settingsGradleGroovy = path.join(androidDir, 'settings.gradle');
        const settingsGradleKts = path.join(androidDir, 'settings.gradle.kts');
        const settingsGradlePath = fs.existsSync(settingsGradleGroovy)
            ? settingsGradleGroovy
            : fs.existsSync(settingsGradleKts)
                ? settingsGradleKts
                : undefined;

        const defaultApkPath = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');

        return {
            hasAndroid: true,
            androidDir,
            gradlewPath: fs.existsSync(gradlewPath) ? gradlewPath : undefined,
            appDir: fs.existsSync(appDir) ? appDir : undefined,
            appBuildGradlePath,
            rootBuildGradlePath,
            settingsGradlePath,
            defaultApkPath: fs.existsSync(defaultApkPath) ? defaultApkPath : undefined
        };
    }
}
