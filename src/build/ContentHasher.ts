import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Logger } from '../utils/Logger';

export class ContentHasher {
    private static ignoredDirs = new Set([
        '.gradle',
        'build',
        '.cxx',
        '.idea',
        'bin',
        'node_modules',
        'generated',
        'intermediates'
    ]);

    private static ignoredExtensions = new Set([
        '.keystore',
        '.jks',
        '.log',
        '.tmp',
        '.hprof'
    ]);

    private static logger = Logger.getInstance();

    public static async calculateProjectNativeHash(projectRoot: string): Promise<{ hash: string; fileCount: number }> {
        const hash = crypto.createHash('sha256');
        let fileCount = 0;

        // 1. Hash android folder if it exists
        const androidDir = path.join(projectRoot, 'android');
        if (fs.existsSync(androidDir)) {
            const files = this.collectFiles(androidDir);
            // Sort deterministically
            files.sort();

            for (const file of files) {
                try {
                    const content = fs.readFileSync(file);
                    const relPath = path.relative(projectRoot, file).replace(/\\/g, '/');
                    hash.update(relPath);
                    hash.update(content);
                    fileCount++;
                } catch {
                    // Ignore unreadable files
                }
            }
        }

        // 2. Hash key configuration and dependency files
        const keyFiles = [
            'package.json',
            'app.json',
            'app.config.js',
            'app.config.ts',
            'yarn.lock',
            'package-lock.json',
            'pnpm-lock.yaml',
            'bun.lockb'
        ];

        for (const kf of keyFiles) {
            const fullPath = path.join(projectRoot, kf);
            if (fs.existsSync(fullPath)) {
                try {
                    const content = fs.readFileSync(fullPath);
                    hash.update(kf);
                    hash.update(content);
                    fileCount++;
                } catch {
                    // Ignore
                }
            }
        }

        const digest = hash.digest('hex');
        this.logger.debug(`Calculated native content hash: ${digest.substring(0, 12)}... across ${fileCount} files.`);
        return { hash: digest, fileCount };
    }

    private static collectFiles(dir: string): string[] {
        const results: string[] = [];

        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);

                if (entry.isDirectory()) {
                    if (!this.ignoredDirs.has(entry.name)) {
                        results.push(...this.collectFiles(fullPath));
                    }
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name).toLowerCase();
                    if (!this.ignoredExtensions.has(ext)) {
                        results.push(fullPath);
                    }
                }
            }
        } catch {
            // Ignore directory read errors
        }

        return results;
    }
}
