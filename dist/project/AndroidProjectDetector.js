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
exports.AndroidProjectDetector = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class AndroidProjectDetector {
    static detect(projectRoot) {
        const androidDir = path.join(projectRoot, 'android');
        if (!fs.existsSync(androidDir)) {
            return { hasAndroid: false };
        }
        const isWin = process.platform === 'win32';
        const gradlewName = isWin ? 'gradlew.bat' : 'gradlew';
        const gradlewPath = path.join(androidDir, gradlewName);
        const appDir = path.join(androidDir, 'app');
        const appBuildGradleGroovy = path.join(appDir, 'build.gradle');
        const appBuildGradleKts = path.join(appDir, 'build.gradle.kts');
        const appBuildGradlePath = fs.existsSync(appBuildGradleGroovy)
            ? appBuildGradleGroovy
            : fs.existsSync(appBuildGradleKts)
                ? appBuildGradleKts
                : undefined;
        const rootBuildGradleGroovy = path.join(androidDir, 'build.gradle');
        const rootBuildGradleKts = path.join(androidDir, 'build.gradle.kts');
        const rootBuildGradlePath = fs.existsSync(rootBuildGradleGroovy)
            ? rootBuildGradleGroovy
            : fs.existsSync(rootBuildGradleKts)
                ? rootBuildGradleKts
                : undefined;
        const settingsGradleGroovy = path.join(androidDir, 'settings.gradle');
        const settingsGradleKts = path.join(androidDir, 'settings.gradle.kts');
        const settingsGradlePath = fs.existsSync(settingsGradleGroovy)
            ? settingsGradleGroovy
            : fs.existsSync(settingsGradleKts)
                ? settingsGradleKts
                : undefined;
        const defaultApkPath = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
        return {
            hasAndroid: true,
            androidDir,
            gradlewPath: fs.existsSync(gradlewPath) ? gradlewPath : undefined,
            appDir: fs.existsSync(appDir) ? appDir : undefined,
            appBuildGradlePath,
            rootBuildGradlePath,
            settingsGradlePath,
            defaultApkPath: fs.existsSync(defaultApkPath) ? defaultApkPath : undefined
        };
    }
}
exports.AndroidProjectDetector = AndroidProjectDetector;
//# sourceMappingURL=AndroidProjectDetector.js.map