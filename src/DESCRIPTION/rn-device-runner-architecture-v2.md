# RN Device Runner (Expo Device Runner) — معماری نسخه ۲

VS Code Extension مستقل برای React Native + Expo (Android)، جایگزین tasks.json/launch.json و شبیه‌ساز جریان کاری Android Studio.

---

## ۱. نمای کلی

```
┌──────────────────────────────────────────────────────────────┐
│                        VS Code                                │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 📱 Pixel 10 Pro XL ▼                     ▶ Run          │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              Editor / React Native Code                 │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                         │
                 Extension Host
                         │
       ┌─────────────────┼─────────────────┐
       ▼                 ▼                 ▼
 Device Manager     Build Manager     Dev Server Manager
       │                 │                 │
       ▼                 ▼                 ▼
   ADB + AVD           Gradle             Metro
   (track-devices)                        Expo
```

---

## ۲. ساختار فایل Extension

```
rn-device-runner/
├── package.json
├── tsconfig.json
├── README.md
├── CHANGELOG.md
│
├── src/
│   ├── extension.ts
│   │
│   ├── commands/
│   │   ├── runCommand.ts
│   │   ├── reloadCommand.ts
│   │   ├── refreshDevicesCommand.ts
│   │   ├── startEmulatorCommand.ts
│   │   ├── pairDeviceCommand.ts        # جدید: وایرلس ADB
│   │   └── stopCommand.ts
│   │
│   ├── devices/
│   │   ├── DeviceManager.ts
│   │   ├── AdbManager.ts               # حالا با AdbClient (adbkit) به‌جای spawn مکرر
│   │   ├── AdbTrackDevices.ts          # جدید: جایگزین polling
│   │   ├── AvdManager.ts
│   │   ├── AvdNameResolver.ts          # جدید: تطبیق serial ↔ avd name
│   │   ├── DeviceParser.ts
│   │   ├── DeviceState.ts
│   │   ├── BootWaiter.ts               # جدید: sys.boot_completed
│   │   └── WirelessPairing.ts          # جدید: adb pair / adb connect
│   │
│   ├── build/
│   │   ├── BuildManager.ts
│   │   ├── BuildDetector.ts
│   │   ├── BuildState.ts
│   │   ├── BuildCache.ts               # حالا مبتنی بر هش محتوا، نه mtime
│   │   ├── ContentHasher.ts            # جدید
│   │   └── NativeFileWatcher.ts        # جدید: chokidar روی android/, app.json, ...
│   │
│   ├── metro/ ...
│   ├── expo/ ...
│   │
│   ├── ui/ ...
│   │
│   ├── project/
│   │   ├── ProjectDetector.ts
│   │   ├── WorkspaceResolver.ts        # جدید: پشتیبانی multi-root workspace
│   │   ├── AndroidProjectDetector.ts
│   │   └── PackageDetector.ts
│   │
│   ├── state/
│   │   └── RunStateMachine.ts          # حالا با xstate پیاده‌سازی می‌شود
│   │
│   ├── config/ ...
│   ├── utils/ ...
│   └── types/
│       ├── Device.ts                   # platform حالا 'android' | 'ios'
│       ├── Build.ts
│       └── Project.ts
│
└── media/ ...
```

---

## ۳. مدل Device (اصلاح‌شده — آماده برای iOS)

```ts
interface Device {
    id: string;
    name: string;

    type: DeviceType;
    state: DeviceState;

    platform: 'android' | 'ios';   // اصلاح: قبلاً فقط 'android' بود

    isPhysical: boolean;
    isEmulator: boolean;

    avdName?: string;              // فقط اندروید
    simulatorId?: string;          // فقط iOS، برای فاز بعدی

    apiLevel?: number;
    model?: string;
    serial?: string;

    connection?: 'usb' | 'wifi';   // جدید: برای پشتیبانی وایرلس ADB
}
```

این تغییر باعث می‌شود اضافه‌کردن `xcrun simctl` برای iOS در فازهای بعدی، معماری فعلی را نشکند.

---

## ۴. Device Manager — بدون Polling

قبلاً `DeviceWatcher` هر ۱-۲ ثانیه `adb devices` را spawn می‌کرد. این نسخه به‌جایش از پروتکل native ADB استفاده می‌کند:

```
adb server (port 5037)
       │
       ▼
host:track-devices   ← اتصال یک‌بار، push مداوم تغییرات
       │
       ▼
DeviceManager.onDeviceListChanged()
```

پیاده‌سازی می‌تواند از کتابخانه‌ای مثل `@devicefarmer/adbkit` استفاده کند که این پروتکل را پوشش می‌دهد، به‌جای spawn مکرر process.

نتیجه:
- مصرف CPU پایین‌تر
- تاخیر واقعاً نزدیک به صفر در تشخیص اتصال/قطع دستگاه
- بدون race condition بین چند polling موازی

---

## ۵. تطبیق AVD نصب‌شده با Emulator در حال اجرا (اصلاح مهم)

سریال یک امولاتور در حال اجرا (`emulator-5554`) به‌خودی‌خود اسم AVD را نشان نمی‌دهد. برای merge درست بین «AVDهای نصب‌شده» و «امولاتورهای فعال» باید جداگانه پرس‌وجو شود:

```
adb -s emulator-5554 emu avd name
```

```
AvdNameResolver
      │
      ▼
for each running emulator serial:
      emu avd name  →  Pixel_10_Pro_XL
      │
      ▼
match against Installed AVDs list
      │
      ▼
Unified Device List (بدون آیتم تکراری یا نامتصل)
```

بدون این مرحله، احتمال دارد یک AVD در حال اجرا هم به‌عنوان «Running» و هم به‌اشتباه به‌عنوان «Stopped» نمایش داده شود.

---

## ۶. Boot Detection دقیق‌تر

به‌جای تکیه بر log یا صرفاً دیده‌شدن سریال در `adb devices`:

```
Start emulator
      │
      ▼
adb -s <serial> wait-for-device
      │
      ▼
poll: adb -s <serial> shell getprop sys.boot_completed
      │
      ▼
value == "1" ?
      │
     YES → DEVICE_READY
```

این روش نسبت به رصد پیام‌های لاگ بوت، پایدارتر و مستقل از نسخه Android است.

---

## ۷. Build Cache مبتنی بر هش محتوا (نه mtime)

مشکل نسخه قبلی: تکیه به mtime فایل‌ها. عملیات‌هایی مثل `git checkout`/`git pull` می‌توانند mtime را بدون تغییر واقعی محتوا عوض کنند و باعث build غیرضروری شوند (دقیقاً همان چیزی که باعث شد build قبلی‌ات ۲۵ دقیقه طول بکشد اگر به‌اشتباه تشخیص داده شود).

```
ContentHasher
      │
      ▼
hash(android/**) + hash(package.json) + hash(app.json / app.config.js)
      │
      ▼
compare with last known hash (BuildCache)
      │
      ▼
changed? → needsNativeBuild = true
```

علاوه بر این، `NativeFileWatcher` (مبتنی بر chokidar) می‌تواند این هش را به‌صورت real-time invalidate کند، به‌جای اینکه فقط لحظه Run بررسی شود — یعنی وضعیت "Build Required" در UI حتی قبل از زدن Run به‌روز است.

---

## ۸. پشتیبانی Wireless ADB (جدید)

با توجه به گوشی فیزیکی تو (Redmi Note 9 Pro)، این قابلیت اضافه شد:

```
WirelessPairing
      │
      ├── pair(ip:port, pairingCode)   → adb pair
      └── connect(ip:port)             → adb connect
```

Command جدید: `RN Device Runner: Pair Wireless Device`

دستگاه‌های متصل وایرلس در همان `Device` model با `connection: 'wifi'` مشخص می‌شوند، بدون نیاز به تغییر در بقیه pipeline.

---

## ۹. پشتیبانی Multi-root Workspace (جدید)

`ProjectDetector` قبلی فرض می‌کرد فقط یک پوشه پروژه باز است. در نسخه اصلاح‌شده:

```
WorkspaceResolver
      │
      ▼
vscode.workspace.workspaceFolders
      │
      ▼
برای هر فولدر: آیا package.json با react-native/expo دارد؟
      │
      ▼
اگر بیش از یکی بود → از کاربر بپرس کدام را هدف بگیرد
اگر فقط یکی بود → همان انتخاب پیش‌فرض
```

این باعث می‌شود Extension در monorepoها یا وقتی چند پروژه هم‌زمان باز است، خراب نشود.

---

## ۱۰. State Machine با xstate

State machine بخش ۱۶ نسخه اول (IDLE → CHECKING → ... → RUNNING) دست‌نویس بود که با افزایش تعداد state/transition مستعد باگ می‌شود. در این نسخه با `xstate` پیاده‌سازی می‌شود:

مزیت‌ها:
- تعریف صریح و قابل‌تست حالت‌ها و گذارها
- جلوگیری از حالت‌های غیرمجاز (مثلاً Launch قبل از Metro Ready)
- امکان visualize کردن state chart برای دیباگ

ساختار state ثابت می‌ماند (IDLE, CHECKING, DEVICE_SELECTED, STARTING_DEVICE, DEVICE_READY, CHECKING_BUILD, BUILDING/METRO_STARTING, INSTALLING/METRO_READY, LAUNCHING, RUNNING, ERROR) — فقط پیاده‌سازی داخلی مطمئن‌تر می‌شود.

---

## ۱۱. بقیه معماری (بدون تغییر نسبت به نسخه اول)

موارد زیر همان‌طور که قبلاً طراحی شد باقی می‌مانند، چون از قبل درست بودند:

- QuickPick + StatusBar به‌جای Webview در نسخه اول
- Run Manager و مسیرهای FirstRun / FastRefresh / Reload / NativeBuild
- Metro Manager با بررسی «Metro از قبل در حال اجراست یا نه»
- Output Channel اختصاصی برای لاگ‌ها
- Android SDK Detector (شامل هشدار conflict چند SDK — مشکلی که خودت قبلاً باهاش مواجه شدی)
- هشدار فضای دیسک قبل از build native
- Command Palette کامل (Select Device / Run / Reload / Refresh / Start Emulator / Diagnose / Pair Wireless Device)

---

## ۱۲. ترتیب پیاده‌سازی به‌روزشده

**Phase 1 — هسته**
Project detection (+ Workspace Resolver) · Android SDK detection · ADB track-devices · AVD detection + AvdNameResolver · Device model (با فیلد platform/connection) · Device dropdown

**Phase 2 — کنترل دستگاه**
Start emulator + BootWaiter (`sys.boot_completed`) · Wireless pairing · Refresh خودکار (بدون polling) · Run button

**Phase 3 — Expo**
تشخیص Expo / expo-dev-client / package name · Metro manager

**Phase 4 — هوش Build**
ContentHasher + BuildCache · NativeFileWatcher · جلوگیری از Gradle build غیرضروری · نصب APK

**Phase 5 — تجربه توسعه‌دهنده**
Fast Refresh · Reload · لاگ‌ها · Error handling · هشدار فضای دیسک · تشخیص SDK

**Phase 6 — پرداخت نهایی**
آیکون دستگاه‌ها · نشانگر وضعیت · Progress · Notification · کلیدهای میانبر · Settings

**Phase 7 — آماده برای iOS (جدید، اختیاری/آینده)**
با توجه به مدل Device که از همین حالا `platform: 'ios'` را پشتیبانی می‌کند: افزودن `SimulatorManager` مبتنی بر `xcrun simctl` بدون نیاز به بازطراحی DeviceManager.

---

نکته کلیدی بدون تغییر: هسته مستقل از Expo طراحی شده و ExpoManager در Phase 3 روی آن سوار می‌شود؛ بنابراین پشتیبانی از React Native CLI خالص یا پروژه native Android در آینده معماری را نمی‌شکند.
