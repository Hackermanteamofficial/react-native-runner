# Change Log

All notable changes to the "react-native-runner" extension will be documented in this file.

## [2.3.0] - 2026-10-03

### Added
- **Hermes Debugger Attachment (CDP)**: `rn-debug` queries Metro's Chrome DevTools Protocol endpoint (`/json`) and directly connects VS Code's JavaScript debugger to the Hermes VM running on the device, enabling inline breakpoints, call stack exploration, and variable inspection.
- **Port 8081 Conflict Auto-Killer**: Automated detection and termination of zombie processes or third-party services locking Metro's bundler port (`rn-kill-port`), with auto-healing prompts on startup.
- **Build Flavor & Variant Quick-Switch**: `rn-select-flavor` enables 1-click switching between `debug`, `release`, `stagingDebug`, or custom product flavors, automatically syncing with `build.gradle` and refreshing the build cache.
- **Cross-Platform macOS iOS Simulator Driver**: Built `IosSimctlManager` supporting `xcrun simctl` device discovery, boot, app launching, deep link routing, and CocoaPods (`pod install`) state validation.

## [2.2.0] - 2026-10-03

### Added
- **Activity Bar Sidebar Viewlet**: Dedicated React Native Runner panel in the VS Code Activity Bar with three interactive TreeViews:
  - **Devices & Emulators**: Real-time connected physical hardware, active emulators, and stopped AVDs with 1-click select and boot.
  - **Quick Controls**: Instant triggers for Run, Reload, Dev Menu, Screenshot, Logcat, Deep Link, and Clean Metro.
  - **Build & Cache Status**: Real-time project architecture info, SHA-256 build hash, file watcher state, and clean rebuild triggers.
- **Intelligent Gradle Error Diagnoser**: Automatic regex pattern scanner diagnosing Java/JDK version mismatches, missing Android SDK platforms, out-of-memory errors, and NDK/CMake issues with 1-click remediation guidance.
- **Expo CNG (Continuous Native Generation) Prebuild Guard**: Automatically warns and offers to run `npx expo prebuild` when native libraries are detected in an unbuilt Expo project.
- **Device Screenshot Capture**: `rn-screenshot` captures pixel-perfect device screenshots via ADB and saves them directly to `.screenshots/` in the project root.

## [2.1.0] - 2026-10-03

### Added
- **In-App Dev Menu Command**: Quick-trigger React Native dev menu (`keyevent 82`) with dedicated shortcut `Ctrl+M` / `Cmd+M` (`rn-dev-menu`).
- **Real-Time Logcat Streamer & Crash Telemetry**: Package- and PID-filtered device log streaming with automated fatal exception and unhandled JS crash detection (`rn-logcat`).
- **Interactive Deep Link Launcher**: Test custom URL schemes and universal links directly from VS Code (`rn-deep-link`).
- **Metro Cache Purge**: Restart Metro dev server with clean cache via `--reset-cache` / `-c` (`rn-metro-clean`).
- **App Sandbox Management**: Rapid storage/cache wipe (`pm clear`) via `rn-clear-data` and clean app removal via `rn-uninstall`.
- **Enriched QuickPick Details**: Live battery level indicator (`🔋 XX%`) and IP address info for connected physical and wireless devices.

## [2.0.0] - 2026-10-03

### Added
- **Native ADB Track-Devices Protocol**: Switched from periodic `adb devices` polling to the official `host:track-devices` push socket over port 5037 for near-instant device detection and lower CPU usage.
- **Content-Hashed Build Cache**: SHA-256 hash comparison across `android/**` and project configuration files to avoid unnecessary Gradle builds caused by `mtime` modifications.
- **Real-Time Native File Watcher**: Automatic detection of native file changes invalidating build caches and alerting via the Status Bar before clicking Run.
- **Unified AVD & Running Emulator Resolver**: Querying `adb -s <serial> emu avd name` to match running emulators with installed AVD definitions, preventing duplicate and phantom device entries.
- **Accurate Boot Detection**: Waiting on `sys.boot_completed == "1"` rather than log text parsing.
- **Wireless ADB Support**: In-editor support for pairing (Android 11+ pairing codes) and direct Wi-Fi connecting (`IP:5555`).
- **Multi-Root Workspace Support**: Automatic workspace scanning with interactive selection for monorepos.
- **System Health Diagnostics Command**: `rn-device-runner.diagnose` command checking Android SDK path conflicts, ADB versions, devices, and free disk space.
- **Forward-Compatible Device Model**: Device model updated to support future iOS simulator extensions (`platform: 'android' | 'ios'`).
