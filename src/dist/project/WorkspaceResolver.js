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
exports.WorkspaceResolver = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const Logger_1 = require("../utils/Logger");
class WorkspaceResolver {
    static instance;
    selectedFolder;
    logger = Logger_1.Logger.getInstance();
    constructor() { }
    static getInstance() {
        if (!WorkspaceResolver.instance) {
            WorkspaceResolver.instance = new WorkspaceResolver();
        }
        return WorkspaceResolver.instance;
    }
    getSelectedFolder() {
        return this.selectedFolder;
    }
    setSelectedFolder(folder) {
        this.selectedFolder = folder;
        this.logger.info(`Active project workspace set to: ${folder.name} (${folder.uri.fsPath})`);
    }
    async resolveWorkspaceFolder(promptIfMultiple = false) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            this.logger.warn('No workspace folders open in VS Code.');
            return undefined;
        }
        const candidateFolders = [];
        for (const folder of workspaceFolders) {
            const pkgPath = path.join(folder.uri.fsPath, 'package.json');
            if (fs.existsSync(pkgPath)) {
                try {
                    const content = fs.readFileSync(pkgPath, 'utf8');
                    const json = JSON.parse(content);
                    const deps = { ...(json.dependencies || {}), ...(json.devDependencies || {}) };
                    const hasReactNative = !!deps['react-native'];
                    const hasExpo = !!deps['expo'];
                    if (hasReactNative || hasExpo) {
                        candidateFolders.push({
                            uri: folder.uri,
                            name: json.name || folder.name,
                            packageJsonPath: pkgPath,
                            hasReactNative,
                            hasExpo
                        });
                    }
                }
                catch (e) {
                    this.logger.warn(`Could not parse package.json in ${folder.uri.fsPath}: ${e}`);
                }
            }
        }
        if (candidateFolders.length === 0) {
            this.logger.warn('No React Native or Expo projects found in open workspace folders.');
            // Fallback to first folder if available
            const first = workspaceFolders[0];
            return {
                uri: first.uri,
                name: first.name,
                packageJsonPath: path.join(first.uri.fsPath, 'package.json'),
                hasReactNative: false,
                hasExpo: false
            };
        }
        if (candidateFolders.length === 1) {
            this.selectedFolder = candidateFolders[0];
            return this.selectedFolder;
        }
        // If previously selected and still in candidates, and prompt not explicitly requested
        if (this.selectedFolder && !promptIfMultiple) {
            const stillExists = candidateFolders.find(c => c.uri.fsPath === this.selectedFolder.uri.fsPath);
            if (stillExists) {
                return this.selectedFolder;
            }
        }
        // Multiple candidates: ask user
        const items = candidateFolders.map(c => ({
            label: `$(folder) ${c.name}`,
            description: c.uri.fsPath,
            detail: `${c.hasExpo ? 'Expo' : ''} ${c.hasReactNative ? 'React Native' : ''}`.trim(),
            folder: c
        }));
        const chosen = await vscode.window.showQuickPick(items, {
            placeHolder: 'Multiple React Native projects detected. Select the active project:',
            title: 'RN Device Runner: Select Workspace Project'
        });
        if (chosen) {
            this.selectedFolder = chosen.folder;
            return this.selectedFolder;
        }
        return candidateFolders[0];
    }
}
exports.WorkspaceResolver = WorkspaceResolver;
//# sourceMappingURL=WorkspaceResolver.js.map