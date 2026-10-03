/**
 * Device models and types for RN Device Runner
 * Supports both Android and iOS (for future extensibility)
 */

export type DeviceType = 'physical' | 'emulator';

export type DeviceState = 'offline' | 'booting' | 'online' | 'unauthorized' | 'ready';

export type PlatformType = 'android' | 'ios';

export type ConnectionType = 'usb' | 'wifi';

export interface Device {
    /** Unique identifier: serial for Android, UDID for iOS */
    id: string;
    /** Human-readable display name (e.g., 'Pixel 8 Pro' or 'Redmi Note 9 Pro') */
    name: string;

    /** Type: physical or emulator */
    type: DeviceType;
    /** Current status of the device */
    state: DeviceState;

    /** Target platform: 'android' | 'ios' */
    platform: PlatformType;

    /** Whether the device is physical hardware */
    isPhysical: boolean;
    /** Whether the device is an emulator / simulator */
    isEmulator: boolean;

    /** AVD Name (Android emulator only) */
    avdName?: string;
    /** Simulator ID (iOS simulator only, for future phase) */
    simulatorId?: string;

    /** Android API level or iOS SDK version */
    apiLevel?: number;
    /** Model string from getprop ro.product.model */
    model?: string;
    /** Device serial or transport ID */
    serial?: string;

    /** Connection interface */
    connection?: ConnectionType;

    /** Battery level percentage (optional) */
    batteryLevel?: number;
    /** IP and Port if wireless */
    networkAddress?: string;
}

export interface AvdInfo {
    name: string;
    target?: string;
    path?: string;
    isRunning: boolean;
    serial?: string;
}
