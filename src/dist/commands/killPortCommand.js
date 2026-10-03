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
exports.killPortCommand = killPortCommand;
const vscode = __importStar(require("vscode"));
const PortHelper_1 = require("../metro/PortHelper");
const ConfigurationManager_1 = require("../config/ConfigurationManager");
const Logger_1 = require("../utils/Logger");
async function killPortCommand() {
    const logger = Logger_1.Logger.getInstance();
    const config = ConfigurationManager_1.ConfigurationManager.getInstance().getConfig();
    const defaultPort = config.metroPort || 8081;
    const input = await vscode.window.showInputBox({
        title: 'React Native Runner: Free Port / Kill Process',
        prompt: 'Enter port to inspect and free:',
        value: defaultPort.toString()
    });
    if (!input) {
        return;
    }
    const port = parseInt(input.trim(), 10);
    if (isNaN(port) || port <= 0) {
        vscode.window.showErrorMessage('Invalid port number.');
        return;
    }
    const pid = await PortHelper_1.PortHelper.getPidOnPort(port);
    if (!pid) {
        vscode.window.showInformationMessage(`Port ${port} is free! No listening process found.`);
        return;
    }
    const confirm = await vscode.window.showWarningMessage(`Port ${port} is occupied by PID ${pid}. Terminate process?`, { modal: true }, 'Kill Process');
    if (confirm === 'Kill Process') {
        const success = await PortHelper_1.PortHelper.killProcess(pid);
        if (success) {
            vscode.window.showInformationMessage(`Terminated process on PID ${pid}. Port ${port} is now free.`);
            logger.info(`Port ${port} freed (killed PID ${pid}).`);
        }
        else {
            vscode.window.showErrorMessage(`Failed to kill process PID ${pid}. It may require administrator privileges.`);
        }
    }
}
//# sourceMappingURL=killPortCommand.js.map