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
exports.cleanMetroCommand = cleanMetroCommand;
const vscode = __importStar(require("vscode"));
const ProjectDetector_1 = require("../project/ProjectDetector");
const MetroManager_1 = require("../metro/MetroManager");
const ConfigurationManager_1 = require("../config/ConfigurationManager");
const Logger_1 = require("../utils/Logger");
async function cleanMetroCommand() {
    const logger = Logger_1.Logger.getInstance();
    const metroManager = MetroManager_1.MetroManager.getInstance();
    const config = ConfigurationManager_1.ConfigurationManager.getInstance().getConfig();
    const project = await ProjectDetector_1.ProjectDetector.getInstance().detect();
    if (!project) {
        vscode.window.showErrorMessage('No React Native or Expo project found.');
        return;
    }
    try {
        metroManager.restartWithCleanCache(project, config.metroPort);
        vscode.window.setStatusBarMessage('$(clear-all) Metro restarting with clean cache...', 4000);
        logger.info(`Metro Bundler restarted with clean cache on port ${config.metroPort}.`);
    }
    catch (e) {
        logger.error(`Failed to restart Metro: ${e.message}`);
        vscode.window.showErrorMessage(`Metro restart failed: ${e.message}`);
    }
}
//# sourceMappingURL=cleanMetroCommand.js.map