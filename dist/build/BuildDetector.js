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
exports.BuildDetector = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class BuildDetector {
    static findApk(projectRoot, flavor = 'debug') {
        const androidDir = path.join(projectRoot, 'android');
        const standardPath = path.join(androidDir, 'app', 'build', 'outputs', 'apk', flavor, `app-${flavor}.apk`);
        if (fs.existsSync(standardPath)) {
            const stat = fs.statSync(standardPath);
            return {
                apkPath: standardPath,
                exists: true,
                sizeBytes: stat.size,
                lastModified: stat.mtime
            };
        }
        // Search recursively in android/app/build/outputs/apk
        const apkBaseDir = path.join(androidDir, 'app', 'build', 'outputs', 'apk');
        if (fs.existsSync(apkBaseDir)) {
            const foundApks = [];
            this.searchApks(apkBaseDir, foundApks);
            if (foundApks.length > 0) {
                // Sort by most recently modified
                foundApks.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
                const newest = foundApks[0];
                return {
                    apkPath: newest.path,
                    exists: true,
                    sizeBytes: newest.size,
                    lastModified: newest.mtime
                };
            }
        }
        return null;
    }
    static searchApks(dir, results) {
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    this.searchApks(fullPath, results);
                }
                else if (entry.isFile() && entry.name.endsWith('.apk')) {
                    const stat = fs.statSync(fullPath);
                    results.push({
                        path: fullPath,
                        mtime: stat.mtime,
                        size: stat.size
                    });
                }
            }
        }
        catch {
            // Ignore
        }
    }
}
exports.BuildDetector = BuildDetector;
//# sourceMappingURL=BuildDetector.js.map