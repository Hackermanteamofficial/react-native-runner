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
exports.Logger = void 0;
const vscode = __importStar(require("vscode"));
class Logger {
    static instance;
    outputChannel;
    isDebugEnabled = false;
    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('RN Device Runner');
    }
    static getInstance() {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }
    setDebugEnabled(enabled) {
        this.isDebugEnabled = enabled;
    }
    formatMessage(level, message) {
        const time = new Date().toLocaleTimeString();
        return `[${time}] [${level}] ${message}`;
    }
    debug(message) {
        if (this.isDebugEnabled) {
            this.outputChannel.appendLine(this.formatMessage('DEBUG', message));
        }
    }
    info(message) {
        this.outputChannel.appendLine(this.formatMessage('INFO', message));
    }
    warn(message) {
        this.outputChannel.appendLine(this.formatMessage('WARN', message));
    }
    error(message, error) {
        let fullMessage = message;
        if (error instanceof Error) {
            fullMessage += ` - ${error.message}\n${error.stack || ''}`;
        }
        else if (error) {
            fullMessage += ` - ${String(error)}`;
        }
        this.outputChannel.appendLine(this.formatMessage('ERROR', fullMessage));
    }
    raw(text) {
        this.outputChannel.append(text);
    }
    rawLine(text) {
        this.outputChannel.appendLine(text);
    }
    show(preserveFocus = true) {
        this.outputChannel.show(preserveFocus);
    }
    clear() {
        this.outputChannel.clear();
    }
    dispose() {
        this.outputChannel.dispose();
    }
}
exports.Logger = Logger;
//# sourceMappingURL=Logger.js.map