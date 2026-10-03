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
exports.BuildStateStore = void 0;
const vscode = __importStar(require("vscode"));
const events_1 = require("events");
class BuildStateStore extends events_1.EventEmitter {
    static instance;
    isBuilding = false;
    currentCts = null;
    statusMessage = '';
    constructor() {
        super();
    }
    static getInstance() {
        if (!BuildStateStore.instance) {
            BuildStateStore.instance = new BuildStateStore();
        }
        return BuildStateStore.instance;
    }
    getIsBuilding() {
        return this.isBuilding;
    }
    getStatusMessage() {
        return this.statusMessage;
    }
    startBuild() {
        this.isBuilding = true;
        this.currentCts = new vscode.CancellationTokenSource();
        this.statusMessage = 'Building Android project...';
        this.emit('buildStateChanged', { isBuilding: true, message: this.statusMessage });
        return this.currentCts.token;
    }
    updateProgress(message) {
        this.statusMessage = message;
        this.emit('progress', message);
    }
    finishBuild() {
        this.isBuilding = false;
        this.statusMessage = '';
        this.currentCts?.dispose();
        this.currentCts = null;
        this.emit('buildStateChanged', { isBuilding: false, message: '' });
    }
    cancelBuild() {
        if (this.currentCts) {
            this.currentCts.cancel();
            this.finishBuild();
        }
    }
}
exports.BuildStateStore = BuildStateStore;
//# sourceMappingURL=BuildState.js.map