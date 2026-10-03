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
exports.BuildCache = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ContentHasher_1 = require("./ContentHasher");
const Logger_1 = require("../utils/Logger");
class BuildCache {
    static instance;
    cacheDirName = '.rn-device-runner';
    cacheFileName = 'build-cache.json';
    logger = Logger_1.Logger.getInstance();
    constructor() { }
    static getInstance() {
        if (!BuildCache.instance) {
            BuildCache.instance = new BuildCache();
        }
        return BuildCache.instance;
    }
    getCacheFilePath(projectRoot) {
        return path.join(projectRoot, this.cacheDirName, this.cacheFileName);
    }
    async getBuildState(projectRoot) {
        const cacheFile = this.getCacheFilePath(projectRoot);
        let persisted;
        if (fs.existsSync(cacheFile)) {
            try {
                persisted = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
            }
            catch {
                this.logger.debug(`Could not parse build cache at ${cacheFile}`);
            }
        }
        const { hash: currentHash } = await ContentHasher_1.ContentHasher.calculateProjectNativeHash(projectRoot);
        let needsNativeBuild = false;
        if (!persisted || !persisted.lastBuildHash) {
            needsNativeBuild = true;
        }
        else if (persisted.lastBuildHash !== currentHash) {
            needsNativeBuild = true;
            this.logger.info(`Native build needed: content hash changed (${persisted.lastBuildHash.substring(0, 8)} -> ${currentHash.substring(0, 8)})`);
        }
        else if (persisted.apkPath && !fs.existsSync(persisted.apkPath)) {
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
    async saveSuccessfulBuild(projectRoot, hash, apkPath) {
        const cacheDir = path.join(projectRoot, this.cacheDirName);
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
        }
        const data = {
            lastBuildHash: hash,
            lastBuildTimestamp: Date.now(),
            apkPath
        };
        const cacheFile = this.getCacheFilePath(projectRoot);
        fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2), 'utf8');
        this.logger.debug(`Build cache updated with hash: ${hash.substring(0, 10)}`);
    }
    invalidate(projectRoot) {
        const cacheFile = this.getCacheFilePath(projectRoot);
        if (fs.existsSync(cacheFile)) {
            try {
                fs.unlinkSync(cacheFile);
                this.logger.info('Build cache invalidated.');
            }
            catch {
                // Ignore
            }
        }
    }
}
exports.BuildCache = BuildCache;
//# sourceMappingURL=BuildCache.js.map