import * as vscode from 'vscode';
import { EventEmitter } from 'events';
import { BuildCache } from './BuildCache';
import { BuildState } from '../types/Build';
import { Logger } from '../utils/Logger';

export class NativeFileWatcher extends EventEmitter {
    private static instance: NativeFileWatcher;
    private disposables: vscode.Disposable[] = [];
    private debounceTimer: NodeJS.Timeout | null = null;
    private currentProjectRoot: string | undefined;
    private logger = Logger.getInstance();

    private constructor() {
        super();
    }

    public static getInstance(): NativeFileWatcher {
        if (!NativeFileWatcher.instance) {
            NativeFileWatcher.instance = new NativeFileWatcher();
        }
        return NativeFileWatcher.instance;
    }

    public startWatching(projectRoot: string): void {
        this.stopWatching();
        this.currentProjectRoot = projectRoot;

        // Watch android directory, package.json, app configs
        const androidWatcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(projectRoot, 'android/**/*.{gradle,kt,java,xml,properties}')
        );
        const configWatcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(projectRoot, '{package.json,app.json,app.config.js,app.config.ts}')
        );

        const onChange = (uri: vscode.Uri) => {
            // Ignore build output or .gradle directories
            const fsPath = uri.fsPath.replace(/\\/g, '/');
            if (fsPath.includes('/android/app/build/') || fsPath.includes('/android/.gradle/')) {
                return;
            }

            this.triggerCheck();
        };

        this.disposables.push(
            androidWatcher.onDidChange(onChange),
            androidWatcher.onDidCreate(onChange),
            androidWatcher.onDidDelete(onChange),
            configWatcher.onDidChange(onChange),
            configWatcher.onDidCreate(onChange),
            configWatcher.onDidDelete(onChange),
            androidWatcher,
            configWatcher
        );

        this.logger.debug(`NativeFileWatcher started for ${projectRoot}`);
        // Initial evaluation
        this.triggerCheck();
    }

    private triggerCheck(): void {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = setTimeout(async () => {
            if (!this.currentProjectRoot) {
                return;
            }
            try {
                const buildState: BuildState = await BuildCache.getInstance().getBuildState(this.currentProjectRoot);
                this.emit('buildStateChanged', buildState);
            } catch (e) {
                this.logger.debug(`File watcher build state evaluation failed: ${e}`);
            }
        }, 600);
    }

    public stopWatching(): void {
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

    public dispose(): void {
        this.stopWatching();
        this.removeAllListeners();
    }
}
