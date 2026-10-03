/**
 * Build-related interfaces and types
 */

export interface BuildState {
    /** Whether changes were detected requiring a new native Gradle build */
    needsNativeBuild: boolean;
    /** Content hash from the most recent successful native build */
    lastBuildHash?: string;
    /** Timestamp of the last successful build */
    lastBuildTimestamp?: number;
    /** Current calculated hash across native files and configs */
    currentHash?: string;
    /** List of paths changed since the last build */
    changedFiles?: string[];
}

export interface BuildOptions {
    /** Build flavor (e.g., 'debug', 'release', 'stagingDebug') */
    flavor?: string;
    /** Force clean build */
    clean?: boolean;
    /** Skip build cache check */
    skipCache?: boolean;
}

export interface BuildResult {
    success: boolean;
    durationMs: number;
    apkPath?: string;
    error?: string;
    skipped?: boolean;
}
