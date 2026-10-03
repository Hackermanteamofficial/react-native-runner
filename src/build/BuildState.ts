import * as vscode from 'vscode';
import { EventEmitter } from 'events';

export class BuildStateStore extends EventEmitter {
    private static instance: BuildStateStore;
    private isBuilding: boolean = false;
    private currentCts: vscode.CancellationTokenSource | null = null;
    private statusMessage: string = '';

    private constructor() {
        super();
    }

    public static getInstance(): BuildStateStore {
        if (!BuildStateStore.instance) {
            BuildStateStore.instance = new BuildStateStore();
        }
        return BuildStateStore.instance;
    }

    public getIsBuilding(): boolean {
        return this.isBuilding;
    }

    public getStatusMessage(): string {
        return this.statusMessage;
    }

    public startBuild(): vscode.CancellationToken {
        this.isBuilding = true;
        this.currentCts = new vscode.CancellationTokenSource();
        this.statusMessage = 'Building Android project...';
        this.emit('buildStateChanged', { isBuilding: true, message: this.statusMessage });
        return this.currentCts.token;
    }

    public updateProgress(message: string): void {
        this.statusMessage = message;
        this.emit('progress', message);
    }

    public finishBuild(): void {
        this.isBuilding = false;
        this.statusMessage = '';
        this.currentCts?.dispose();
        this.currentCts = null;
        this.emit('buildStateChanged', { isBuilding: false, message: '' });
    }

    public cancelBuild(): void {
        if (this.currentCts) {
            this.currentCts.cancel();
            this.finishBuild();
        }
    }
}
