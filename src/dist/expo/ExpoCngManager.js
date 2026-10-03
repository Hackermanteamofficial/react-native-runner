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
exports.ExpoCngManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const Logger_1 = require("../utils/Logger");
class ExpoCngManager {
    static instance;
    logger = Logger_1.Logger.getInstance();
    constructor() { }
    static getInstance() {
        if (!ExpoCngManager.instance) {
            ExpoCngManager.instance = new ExpoCngManager();
        }
        return ExpoCngManager.instance;
    }
    async checkAndPromptPrebuild(project) {
        // If android folder already exists, prebuild is already done
        if (project.hasAndroid) {
            return 'proceed';
        }
        // If not an Expo project, no CNG check needed
        if (!project.isExpo) {
            return 'proceed';
        }
        const packageJsonPath = path.join(project.rootPath, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
            return 'proceed';
        }
        try {
            const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
            const deps = { ...pkg.dependencies, ...pkg.devDependencies };
            // Scan for dependencies that indicate native code requiring development builds
            const hasCustomNativeModules = Object.keys(deps).some(dep => (dep.startsWith('react-native-') && !dep.includes('web') && !dep.includes('safe-area-context') && !dep.includes('screens')) ||
                dep.startsWith('@react-native-') ||
                dep.startsWith('@stripe/') ||
                dep.includes('vision-camera') ||
                dep.includes('google-signin') ||
                dep.includes('firebase'));
            if (hasCustomNativeModules) {
                const choice = await vscode.window.showWarningMessage(`This Expo project contains native libraries that require a Development Build (expo-dev-client). The 'android/' directory is missing.`, 'Run Expo Prebuild', 'Continue with Expo Go anyway', 'Cancel');
                if (choice === 'Run Expo Prebuild') {
                    this.logger.info('Running "npx expo prebuild --platform android"...');
                    const terminal = vscode.window.createTerminal({
                        name: 'Expo Prebuild',
                        cwd: project.rootPath
                    });
                    terminal.show(true);
                    terminal.sendText('npx expo prebuild --platform android');
                    vscode.window.showInformationMessage('Expo prebuild started in terminal. Re-run after prebuild completes.');
                    return 'cancelled';
                }
                else if (choice === 'Cancel' || !choice) {
                    return 'cancelled';
                }
            }
        }
        catch (e) {
            this.logger.warn(`Could not parse package.json for CNG check: ${e}`);
        }
        return 'proceed';
    }
}
exports.ExpoCngManager = ExpoCngManager;
//# sourceMappingURL=ExpoCngManager.js.map