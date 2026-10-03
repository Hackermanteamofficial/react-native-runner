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
exports.ProjectDetector = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const WorkspaceResolver_1 = require("./WorkspaceResolver");
const AndroidProjectDetector_1 = require("./AndroidProjectDetector");
const PackageDetector_1 = require("./PackageDetector");
const Logger_1 = require("../utils/Logger");
class ProjectDetector {
    static instance;
    cachedInfo;
    logger = Logger_1.Logger.getInstance();
    constructor() { }
    static getInstance() {
        if (!ProjectDetector.instance) {
            ProjectDetector.instance = new ProjectDetector();
        }
        return ProjectDetector.instance;
    }
    async detect(forceRefresh = false) {
        if (this.cachedInfo && !forceRefresh) {
            return this.cachedInfo;
        }
        const workspaceFolder = await WorkspaceResolver_1.WorkspaceResolver.getInstance().resolveWorkspaceFolder();
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
            }
            catch (err) {
                this.logger.warn(`ProjectDetector: Failed to parse package.json: ${err}`);
            }
        }
        const androidInfo = AndroidProjectDetector_1.AndroidProjectDetector.detect(rootPath);
        const packageDetails = PackageDetector_1.PackageDetector.detect(rootPath, androidInfo.androidDir);
        let type = 'unknown';
        if (isExpo) {
            type = androidInfo.hasAndroid ? 'expo-bare' : 'expo-managed';
        }
        else if (androidInfo.hasAndroid) {
            type = 'react-native-cli';
        }
        let appConfigPath;
        const appJson = path.join(rootPath, 'app.json');
        const appConfigJs = path.join(rootPath, 'app.config.js');
        const appConfigTs = path.join(rootPath, 'app.config.ts');
        if (fs.existsSync(appJson)) {
            appConfigPath = appJson;
        }
        else if (fs.existsSync(appConfigJs)) {
            appConfigPath = appConfigJs;
        }
        else if (fs.existsSync(appConfigTs)) {
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
    clearCache() {
        this.cachedInfo = undefined;
    }
}
exports.ProjectDetector = ProjectDetector;
//# sourceMappingURL=ProjectDetector.js.map