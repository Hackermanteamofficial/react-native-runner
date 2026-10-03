# Change Log

All notable changes to the "rn-device-runner" extension will be documented in this file.

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
