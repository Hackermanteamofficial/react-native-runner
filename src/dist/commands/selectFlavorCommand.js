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
exports.selectFlavorCommand = selectFlavorCommand;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const ProjectDetector_1 = require("../project/ProjectDetector");
const ConfigurationManager_1 = require("../config/ConfigurationManager");
const BuildCache_1 = require("../build/BuildCache");
const Logger_1 = require("../utils/Logger");
async function selectFlavorCommand() {
    const logger = Logger_1.Logger.getInstance();
    const config = ConfigurationManager_1.ConfigurationManager.getInstance().getConfig();
    const currentFlavor = config.buildFlavor || 'debug';
    const project = await ProjectDetector_1.ProjectDetector.getInstance().detect();
    const flavorOptions = [
        { label: '$(gear) debug', description: currentFlavor === 'debug' ? '(Active)' : 'Standard debug build', flavor: 'debug' },
        { label: '$(package) release', description: currentFlavor === 'release' ? '(Active)' : 'Optimized production build', flavor: 'release' }
    ];
    // Detect product flavors in android/app/build.gradle if available
    if (project?.hasAndroid) {
        const buildGradlePath = path.join(project.rootPath, 'android', 'app', 'build.gradle');
        if (fs.existsSync(buildGradlePath)) {
            try {
                const content = fs.readFileSync(buildGradlePath, 'utf-8');
                const flavorMatch = content.match(/flavorDimensions[^{]*productFlavors\s*\{([^}]+)\}/s);
                if (flavorMatch && flavorMatch[1]) {
                    const block = flavorMatch[1];
                    const detectedFlavors = block.match(/^\s*([a-zA-Z0-9_]+)\s*\{/gm);
                    if (detectedFlavors) {
                        for (const raw of detectedFlavors) {
                            const name = raw.replace(/[\s{]/g, '');
                            if (name && !['flavorDimensions', 'create'].includes(name)) {
                                flavorOptions.push({
                                    label: `$(symbol-module) ${name}Debug`,
                                    description: currentFlavor === `${name}Debug` ? '(Active)' : 'Debug flavor',
                                    flavor: `${name}Debug`
                                });
                                flavorOptions.push({
                                    label: `$(symbol-module) ${name}Release`,
                                    description: currentFlavor === `${name}Release` ? '(Active)' : 'Release flavor',
                                    flavor: `${name}Release`
                                });
                            }
                        }
                    }
                }
            }
            catch (e) {
                logger.debug(`Could not inspect product flavors in build.gradle: ${e}`);
            }
        }
    }
    flavorOptions.push({
        label: '$(edit) Custom Flavor...',
        description: 'Enter a custom Gradle build flavor or task name',
        flavor: '__CUSTOM__'
    });
    const choice = await vscode.window.showQuickPick(flavorOptions, {
        title: 'React Native Runner: Select Android Build Flavor',
        placeHolder: `Current Flavor: ${currentFlavor}`
    });
    if (!choice) {
        return;
    }
    let targetFlavor = choice.flavor;
    if (targetFlavor === '__CUSTOM__') {
        const input = await vscode.window.showInputBox({
            title: 'Enter Custom Build Flavor',
            prompt: 'Gradle build variant (e.g. stagingDebug, devRelease):',
            value: currentFlavor
        });
        if (!input || !input.trim()) {
            return;
        }
        targetFlavor = input.trim();
    }
    if (targetFlavor === currentFlavor) {
        return;
    }
    try {
        await vscode.workspace.getConfiguration('rnDeviceRunner').update('buildFlavor', targetFlavor, vscode.ConfigurationTarget.Workspace);
        if (project) {
            await BuildCache_1.BuildCache.getInstance().invalidate(project.rootPath);
        }
        vscode.window.showInformationMessage(`Build flavor switched to: "${targetFlavor}". Build cache refreshed.`);
        logger.info(`Active build flavor changed to "${targetFlavor}".`);
    }
    catch (e) {
        logger.error(`Failed to update build flavor: ${e.message}`);
        vscode.window.showErrorMessage(`Failed to update build flavor: ${e.message}`);
    }
}
//# sourceMappingURL=selectFlavorCommand.js.map