import * as fs from 'fs';
import * as path from 'path';

export interface PackageDetails {
    packageName?: string;
    scheme?: string;
    mainActivity?: string;
}

export class PackageDetector {
    public static detect(projectRoot: string, androidDir?: string): PackageDetails {
        let packageName: string | undefined;
        let scheme: string | undefined;
        let mainActivity: string = '.MainActivity';

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
            } catch {
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
                    } else {
                        // Look for namespace "com.example.app" (modern AGP)
                        const namespaceMatch = content.match(/namespace\s+["']([^"']+)["']/);
                        if (namespaceMatch) {
                            packageName = namespaceMatch[1];
                        }
                    }
                } catch {
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
                } catch {
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
