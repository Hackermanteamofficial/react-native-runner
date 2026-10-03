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
exports.PackageDetector = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class PackageDetector {
    static detect(projectRoot, androidDir) {
        let packageName;
        let scheme;
        let mainActivity = '.MainActivity';
        // 1. Try app.json / app.config.js
        const appJsonPath = path.join(projectRoot, 'app.json');
        if (fs.existsSync(appJsonPath)) {
            try {
                const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
                const expo = appJson.expo || appJson;
                if (expo.android?.package) {
                    packageName = expo.android.package;
                }
                if (expo.scheme) {
                    scheme = typeof expo.scheme === 'string' ? expo.scheme : expo.scheme[0];
                }
            }
            catch {
                // Ignore parse errors
            }
        }
        // 2. Try android/app/build.gradle
        const targetAndroidDir = androidDir || path.join(projectRoot, 'android');
        if (!packageName && fs.existsSync(targetAndroidDir)) {
            const buildGradle = path.join(targetAndroidDir, 'app', 'build.gradle');
            if (fs.existsSync(buildGradle)) {
                try {
                    const content = fs.readFileSync(buildGradle, 'utf8');
                    // Look for applicationId "com.example.app"
                    const appIdMatch = content.match(/applicationId\s+["']([^"']+)["']/);
                    if (appIdMatch) {
                        packageName = appIdMatch[1];
                    }
                    else {
                        // Look for namespace "com.example.app" (modern AGP)
                        const namespaceMatch = content.match(/namespace\s+["']([^"']+)["']/);
                        if (namespaceMatch) {
                            packageName = namespaceMatch[1];
                        }
                    }
                }
                catch {
                    // Ignore
                }
            }
            // Also check AndroidManifest.xml
            const manifestPath = path.join(targetAndroidDir, 'app', 'src', 'main', 'AndroidManifest.xml');
            if (fs.existsSync(manifestPath)) {
                try {
                    const manifest = fs.readFileSync(manifestPath, 'utf8');
                    if (!packageName) {
                        const packageMatch = manifest.match(/package\s*=\s*["']([^"']+)["']/);
                        if (packageMatch) {
                            packageName = packageMatch[1];
                        }
                    }
                    // Check for custom MainActivity name
                    const activityMatch = manifest.match(/<activity[^>]*android:name=["']([^"']+)["'][^>]*>[\s\S]*?android\.intent\.action\.MAIN/);
                    if (activityMatch) {
                        mainActivity = activityMatch[1];
                    }
                }
                catch {
                    // Ignore
                }
            }
        }
        return {
            packageName,
            scheme,
            mainActivity
        };
    }
}
exports.PackageDetector = PackageDetector;
//# sourceMappingURL=PackageDetector.js.map