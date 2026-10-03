import * as fs from 'fs';
import * as path from 'path';
import { BuildState } from '../types/Build';
import { ContentHasher } from './ContentHasher';
import { Logger } from '../utils/Logger';

interface PersistedCache {
    lastBuildHash: string;
    lastBuildTimestamp: number;
    apkPath?: string;
}

export class BuildCache {
    private static instance: BuildCache;
    private cacheDirName = '.rn-device-runner';
    private cacheFileName = 'build-cache.json';
    private logger = Logger.getInstance();

    private constructor() {}

    public static getInstance(): BuildCache {
        if (!BuildCache.instance) {
            BuildCache.instance = new BuildCache();
        }
        return BuildCache.instance;
    }

    private getCacheFilePath(projectRoot: string): string {
        return path.join(projectRoot, this.cacheDirName, this.cacheFileName);
    }

    public async getBuildState(projectRoot: string): Promise<BuildState> {
        const cacheFile = this.getCacheFilePath(projectRoot);
        let persisted: PersistedCache | undefined;

        if (fs.existsSync(cacheFile)) {
            try {
                persisted = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
            } catch {
                this.logger.debug(`Could not parse build cache at ${cacheFile}`);
            }
        }

        const { hash: currentHash } = await ContentHasher.calculateProjectNativeHash(projectRoot);

        let needsNativeBuild = false;

        if (!persisted || !persisted.lastBuildHash) {
            needsNativeBuild = true;
        } else if (persisted.lastBuildHash !== currentHash) {
            needsNativeBuild = true;
            this.logger.info(`Native build needed: content hash changed (${persisted.lastBuildHash.substring(0, 8)} -> ${currentHash.substring(0, 8)})`);
        } else if (persisted.apkPath && !fs.existsSync(persisted.apkPath)) {
            needsNativeBuild = true;
            this.logger.info(`Native build needed: previously built APK not found at ${persisted.apkPath}`);
        }

        return {
            needsNativeBuild,
            lastBuildHash: persisted?.lastBuildHash,
            lastBuildTimestamp: persisted?.lastBuildTimestamp,
            currentHash
        };
    }

    public async saveSuccessfulBuild(projectRoot: string, hash: string, apkPath?: string): Promise<void> {
        const cacheDir = path.join(projectRoot, this.cacheDirName);
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
        }

        const data: PersistedCache = {
            lastBuildHash: hash,
            lastBuildTimestamp: Date.now(),
            apkPath
        };

        const cacheFile = this.getCacheFilePath(projectRoot);
        fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2), 'utf8');
        this.logger.debug(`Build cache updated with hash: ${hash.substring(0, 10)}`);
    }

    public invalidate(projectRoot: string): void {
        const cacheFile = this.getCacheFilePath(projectRoot);
        if (fs.existsSync(cacheFile)) {
            try {
                fs.unlinkSync(cacheFile);
                this.logger.info('Build cache invalidated.');
            } catch {
                // Ignore
            }
        }
    }
}
