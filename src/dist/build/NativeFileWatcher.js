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
exports.NativeFileWatcher = void 0;
const vscode = __importStar(require("vscode"));
const events_1 = require("events");
const BuildCache_1 = require("./BuildCache");
const Logger_1 = require("../utils/Logger");
class NativeFileWatcher extends events_1.EventEmitter {
    static instance;
    disposables = [];
    debounceTimer = null;
    currentProjectRoot;
    logger = Logger_1.Logger.getInstance();
    constructor() {
        super();
    }
    static getInstance() {
        if (!NativeFileWatcher.instance) {
            NativeFileWatcher.instance = new NativeFileWatcher();
        }
        return NativeFileWatcher.instance;
    }
    startWatching(projectRoot) {
        this.stopWatching();
        this.currentProjectRoot = projectRoot;
        // Watch android directory, package.json, app configs
        const androidWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(projectRoot, 'android/**/*.{gradle,kt,java,xml,properties}'));
        const configWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(projectRoot, '{package.json,app.json,app.config.js,app.config.ts}'));
        const onChange = (uri) => {
            // Ignore build output or .gradle directories
            const fsPath = uri.fsPath.replace(/\\/g, '/');
            if (fsPath.includes('/android/app/build/') || fsPath.includes('/android/.gradle/')) {
                return;
            }
            this.triggerCheck();
        };
        this.disposables.push(androidWatcher.onDidChange(onChange), androidWatcher.onDidCreate(onChange), androidWatcher.onDidDelete(onChange), configWatcher.onDidChange(onChange), configWatcher.onDidCreate(onChange), configWatcher.onDidDelete(onChange), androidWatcher, configWatcher);
        this.logger.debug(`NativeFileWatcher started for ${projectRoot}`);
        // Initial evaluation
        this.triggerCheck();
    }
    triggerCheck() {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = setTimeout(async () => {
            if (!this.currentProjectRoot) {
                return;
            }
            try {
                const buildState = await BuildCache_1.BuildCache.getInstance().getBuildState(this.currentProjectRoot);
                this.emit('buildStateChanged', buildState);
            }
            catch (e) {
                this.logger.debug(`File watcher build state evaluation failed: ${e}`);
            }
        }, 600);
    }
    stopWatching() {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
        for (const d of this.disposables) {
            d.dispose();
        }
        this.disposables = [];
        this.currentProjectRoot = undefined;
    }
    dispose() {
        this.stopWatching();
        this.removeAllListeners();
    }
}
exports.NativeFileWatcher = NativeFileWatcher;
//# sourceMappingURL=NativeFileWatcher.js.map