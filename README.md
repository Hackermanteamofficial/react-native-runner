# RN Device Runner (Expo & React Native) — Architecture v2

An enterprise-grade, independent VS Code extension for React Native and Expo (Android), completely eliminating the need for boilerplate `tasks.json` / `launch.json` and mimicking the seamless workflow of Android Studio right inside VS Code.

---

## 🚀 Key Highlights & Architecture (v2)

### 1. Zero-Polling Device Tracking
* Traditional extensions spawn `adb devices` every 1–2 seconds, causing high CPU churn and race conditions.
* **RN Device Runner** uses the native ADB daemon socket protocol (`host:track-devices` over port `5037`) for zero-latency, push-based connection and disconnection events with minimal CPU impact.

### 2. Content-Hashed Native Build Intelligence
* Prevents unnecessary 15–30 minute Gradle rebuilds caused by `git checkout` or file touches that alter `mtime`.
* Deterministically hashes `android/**`, `package.json`, `app.json`, `app.config.*`, and lockfiles using SHA-256.
* An active **`NativeFileWatcher`** recalculates cache validity in real time, notifying you in the Status Bar (`$(tools) Build Needed`) before you even press Run.

### 3. Unified AVD & Emulator Resolver
* Queries running emulators via `adb -s <serial> emu avd name` to pair them directly with installed AVD definitions.
* Eliminates ghost/duplicate device entries and accurately reflects running vs. stopped emulators.

### 4. Reliable Boot Detection
* Directly polls `adb shell getprop sys.boot_completed == "1"` alongside `wait-for-device`.
* Eliminates brittle log parsing and supports cold-booting emulators directly from the Status Bar.

### 5. Native Wireless ADB Pairing
* Full support for Wi-Fi debugging (Android 11+ pairing codes and direct `IP:5555` connections).
* Ideal for physical testing on devices like Xiaomi Redmi Note, Pixel, and Galaxy phones without USB cables.

### 6. Multi-Root Workspace Support
* Seamlessly scans monorepos or multi-folder workspaces.
* Auto-detects projects with `react-native` or `expo`, allowing interactive workspace selection when multiple projects are open.

### 7. Finite State Machine Pipeline
* The run sequence is powered by a formal state machine (`IDLE` ➔ `CHECKING` ➔ `DEVICE_SELECTED` ➔ `STARTING_DEVICE` ➔ `DEVICE_READY` ➔ `CHECKING_BUILD` ➔ `BUILDING` ➔ `METRO_STARTING` ➔ `LAUNCHING` ➔ `RUNNING`), preventing illegal state transitions and race conditions.

---

## 📱 Status Bar Controls

The extension places lightweight, reactive controls in your VS Code Status Bar:

* `$(device-mobile) Pixel 10 Pro XL ▼` — Click to open the rich QuickPick device menu.
* `$(play) Run RN` — Runs the full automated pipeline (boot, build, metro, launch).
* `$(tools) Build Needed` — Proactive indicator showing when native Android code was modified.
* `$(refresh) Reload` — Fast reload React Native without touching the device.

---

## ⚡ Shortened Commands

All commands have short, quick-type identifiers in the Command Palette (`Ctrl+Shift+P`):

| Command ID | Title | Shortcut | Action |
| :--- | :--- | :--- | :--- |
| `rn-run` | **RN: Run** | `Ctrl+Shift+R` | Run full automated pipeline (boot, build, metro, launch) |
| `rn-stop` | **RN: Stop** | — | Stop running build, dev server, or emulator |
| `rn-reload` | **RN: Reload** | — | Trigger fast reload on target device |
| `rn-select` | **RN: Select Device** | `Ctrl+Shift+D` | Open interactive device & emulator picker |
| `rn-refresh` | **RN: Refresh Devices** | — | Rescan ADB devices and installed AVDs |
| `rn-emulator` | **RN: Start Emulator** | — | Choose and boot an installed Android AVD |
| `rn-pair` | **RN: Pair Wireless (ADB)** | — | Connect phone via Wi-Fi (Android 11+ or port 5555) |
| `rn-diagnose` | **RN: Diagnose** | — | Run comprehensive health check and SDK inspection |

*(Note: Original long command names such as `rn-device-runner.run` remain available as aliases.)*

---

## ⚙️ Configuration Settings

| Setting | Default | Description |
| :--- | :--- | :--- |
| `rnDeviceRunner.androidSdkPath` | `""` | Custom Android SDK path (overrides `ANDROID_HOME` & `local.properties`). |
| `rnDeviceRunner.adbPath` | `""` | Custom path to the `adb` executable. |
| `rnDeviceRunner.emulatorPath` | `""` | Custom path to the `emulator` executable. |
| `rnDeviceRunner.metroPort` | `8081` | Port used by the Metro bundler. |
| `rnDeviceRunner.buildFlavor` | `"debug"` | Gradle build flavor (`debug`, `release`, etc.). |
| `rnDeviceRunner.autoStartMetro` | `true` | Automatically starts Metro in a terminal if not running. |
| `rnDeviceRunner.warnLowDiskSpace` | `true` | Warns if free disk space is below threshold before building. |
| `rnDeviceRunner.diskSpaceThresholdGb` | `5` | Disk space threshold in GB. |
| `rnDeviceRunner.wirelessAdbDefaultPort` | `5555` | Default port for direct Wi-Fi ADB connections. |

---

## 🔍 System Diagnostics

Run `RN Device Runner: Run Diagnostics` from the Command Palette (`Ctrl+Shift+P`) to inspect:
* Android SDK paths and conflict detection between environment variables and `local.properties`.
* ADB tool accessibility and version.
* Connected physical devices and emulators.
* Active React Native / Expo workspace configuration.
* Disk space status on the project volume.
