import * as fs from 'fs';
import * as path from 'path';

export interface ApkDetails {
    apkPath: string;
    exists: boolean;
    sizeBytes?: number;
    lastModified?: Date;
}

export class BuildDetector {
    public static findApk(projectRoot: string, flavor: string = 'debug'): ApkDetails | null {
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
            const foundApks: { path: string; mtime: Date; size: number }[] = [];
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

    private static searchApks(dir: string, results: { path: string; mtime: Date; size: number }[]): void {
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    this.searchApks(fullPath, results);
                } else if (entry.isFile() && entry.name.endsWith('.apk')) {
                    const stat = fs.statSync(fullPath);
                    results.push({
                        path: fullPath,
                        mtime: stat.mtime,
                        size: stat.size
                    });
                }
            }
        } catch {
            // Ignore
        }
    }
}
