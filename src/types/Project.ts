/**
 * Project-related interfaces and types
 */

export type ProjectType = 'expo-managed' | 'expo-bare' | 'react-native-cli' | 'unknown';

export interface ProjectInfo {
    /** Root directory of the project */
    rootPath: string;
    /** Human-readable project or folder name */
    name: string;
    /** Project architecture type */
    type: ProjectType;
    /** Whether Expo is used in any capacity */
    isExpo: boolean;
    /** Whether expo-dev-client is detected */
    isExpoDevClient: boolean;
    /** Whether an android/ directory exists */
    hasAndroid: boolean;
    /** Absolute path to android/ folder if present */
    androidPath?: string;
    /** Resolved Android package name / applicationId */
    packageName?: string;
    /** Deep link scheme defined in app.json or AndroidManifest */
    appScheme?: string;
    /** Path to the root package.json */
    packageJsonPath: string;
    /** Path to app.json or app.config.js if exists */
    appConfigPath?: string;
}
