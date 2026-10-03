import * as fs from 'fs';
import * as path from 'path';
import { ProjectInfo, ProjectType } from '../types/Project';
import { WorkspaceResolver } from './WorkspaceResolver';
import { AndroidProjectDetector } from './AndroidProjectDetector';
import { PackageDetector } from './PackageDetector';
import { Logger } from '../utils/Logger';

export class ProjectDetector {
    private static instance: ProjectDetector;
    private cachedInfo: ProjectInfo | undefined;
    private logger = Logger.getInstance();

    private constructor() {}

    public static getInstance(): ProjectDetector {
        if (!ProjectDetector.instance) {
            ProjectDetector.instance = new ProjectDetector();
        }
        return ProjectDetector.instance;
    }

    public async detect(forceRefresh: boolean = false): Promise<ProjectInfo | undefined> {
        if (this.cachedInfo && !forceRefresh) {
            return this.cachedInfo;
        }

        const workspaceFolder = await WorkspaceResolver.getInstance().resolveWorkspaceFolder();
        if (!workspaceFolder) {
            this.logger.warn('ProjectDetector: No workspace folder resolved.');
            return undefined;
        }

        const rootPath = workspaceFolder.uri.fsPath;
        const packageJsonPath = path.join(rootPath, 'package.json');

        let projectName = workspaceFolder.name;
        let isExpo = false;
        let isExpoDevClient = false;

        if (fs.existsSync(packageJsonPath)) {
            try {
                const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                if (pkg.name) {
                    projectName = pkg.name;
                }
                const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
                isExpo = !!deps['expo'];
                isExpoDevClient = !!deps['expo-dev-client'];
            } catch (err) {
                this.logger.warn(`ProjectDetector: Failed to parse package.json: ${err}`);
            }
        }

        const androidInfo = AndroidProjectDetector.detect(rootPath);
        const packageDetails = PackageDetector.detect(rootPath, androidInfo.androidDir);

        let type: ProjectType = 'unknown';
        if (isExpo) {
            type = androidInfo.hasAndroid ? 'expo-bare' : 'expo-managed';
        } else if (androidInfo.hasAndroid) {
            type = 'react-native-cli';
        }

        let appConfigPath: string | undefined;
        const appJson = path.join(rootPath, 'app.json');
        const appConfigJs = path.join(rootPath, 'app.config.js');
        const appConfigTs = path.join(rootPath, 'app.config.ts');

        if (fs.existsSync(appJson)) {
            appConfigPath = appJson;
        } else if (fs.existsSync(appConfigJs)) {
            appConfigPath = appConfigJs;
        } else if (fs.existsSync(appConfigTs)) {
            appConfigPath = appConfigTs;
        }

        this.cachedInfo = {
            rootPath,
            name: projectName,
            type,
            isExpo,
            isExpoDevClient,
            hasAndroid: androidInfo.hasAndroid,
            androidPath: androidInfo.androidDir,
            packageName: packageDetails.packageName,
            appScheme: packageDetails.scheme,
            packageJsonPath,
            appConfigPath
        };

        this.logger.info(`Detected Project: ${projectName} (${type}) | Package: ${packageDetails.packageName || 'unknown'}`);
        return this.cachedInfo;
    }

    public clearCache(): void {
        this.cachedInfo = undefined;
    }
}
