export interface GradleDiagnosis {
    category: 'JDK_MISMATCH' | 'MISSING_SDK' | 'OUT_OF_MEMORY' | 'NDK_CMAKE' | 'MANIFEST_MERGE' | 'DUPLICATE_CLASS' | 'GENERIC';
    title: string;
    details: string;
    actionLabel?: string;
    actionDocUrl?: string;
}

export class GradleErrorDiagnoser {
    public static diagnose(rawOutput: string): GradleDiagnosis {
        // 1. JDK Version Mismatch
        if (/Unsupported class file major version|Android Gradle plugin requires Java \d+|compiled by a more recent version of the Java Runtime/i.test(rawOutput)) {
            const javaMatch = rawOutput.match(/requires Java (\d+)/i) || rawOutput.match(/major version (\d+)/i);
            const targetJava = javaMatch ? `Java ${javaMatch[1]}` : 'Java 17';

            return {
                category: 'JDK_MISMATCH',
                title: 'Incompatible Java (JDK) Version',
                details: `Your configured JDK is incompatible with this project's Android Gradle Plugin. Modern AGP (8.x+) requires ${targetJava}. Ensure JAVA_HOME points to JDK 17.`,
                actionLabel: 'Configure JAVA_HOME in settings',
                actionDocUrl: 'https://reactnative.dev/docs/set-up-your-environment'
            };
        }

        // 2. Missing Android SDK Platform or Build-Tools
        const sdkMatch = rawOutput.match(/platforms;android-(\d+)/i) || rawOutput.match(/platform with hash string ['"]android-(\d+)['"]/i);
        if (sdkMatch || /SDK location not found/i.test(rawOutput)) {
            const apiLevel = sdkMatch ? `API ${sdkMatch[1]}` : 'the required target API';
            return {
                category: 'MISSING_SDK',
                title: `Missing Android SDK Platform (${apiLevel})`,
                details: `Android SDK platform for ${apiLevel} is not installed or ANDROID_HOME is misconfigured. Open Android Studio SDK Manager or run 'sdkmanager "platforms;android-${sdkMatch ? sdkMatch[1] : 'XX'}"'.`,
                actionLabel: 'Open Run Diagnostics'
            };
        }

        // 3. Out of Memory (OOM)
        if (/OutOfMemoryError: Metaspace|OutOfMemoryError: Java heap space|GC overhead limit exceeded/i.test(rawOutput)) {
            return {
                category: 'OUT_OF_MEMORY',
                title: 'Gradle Daemon Out Of Memory',
                details: 'Gradle ran out of memory while compiling. Increase heap allocation by adding `org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m` to android/gradle.properties.',
                actionLabel: 'Memory Optimization Guide'
            };
        }

        // 4. Missing NDK or CMake (React Native New Architecture)
        if (/No version of NDK matched the requested version|NDK not configured|CMake Error/i.test(rawOutput)) {
            const ndkMatch = rawOutput.match(/requested version ([0-9.]+)/i);
            const ndkVer = ndkMatch ? `version ${ndkMatch[1]}` : 'the required version';
            return {
                category: 'NDK_CMAKE',
                title: 'Missing or Incompatible Android NDK / CMake',
                details: `React Native New Architecture requires Android NDK ${ndkVer}. Install it via Android Studio > SDK Manager > SDK Tools > NDK (Side by side).`,
                actionLabel: 'Open NDK Documentation'
            };
        }

        // 5. Manifest Merge Conflict
        if (/Manifest merger failed/i.test(rawOutput)) {
            return {
                category: 'MANIFEST_MERGE',
                title: 'AndroidManifest Merger Conflict',
                details: 'Multiple dependencies defined conflicting attributes in AndroidManifest.xml. Review the merge conflict in android/app/build/outputs/logs/manifest-merger-debug-report.txt.',
                actionLabel: 'Inspect Manifest'
            };
        }

        // 6. Duplicate Classes / Multi-Dex
        if (/Type .* is defined multiple times|Duplicate class/i.test(rawOutput)) {
            return {
                category: 'DUPLICATE_CLASS',
                title: 'Duplicate Dependency / Class Collision',
                details: 'Two or more native libraries include duplicate classes. Run `gradlew app:dependencies` in the android/ directory to find conflicting libraries.',
                actionLabel: 'View Dependency Tree'
            };
        }

        // Generic fallback
        return {
            category: 'GENERIC',
            title: 'Gradle Build Failed',
            details: 'Review the React Native Runner Output Channel for full compilation error logs.',
            actionLabel: 'Show Output Log'
        };
    }
}
