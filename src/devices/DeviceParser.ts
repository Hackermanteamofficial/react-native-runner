import { Device, DeviceState, DeviceType, ConnectionType } from '../types/Device';

export interface ParsedRawDevice {
    serial: string;
    state: DeviceState;
    product?: string;
    model?: string;
    device?: string;
    transportId?: string;
}

export class DeviceParser {
    public static parseAdbDevicesOutput(output: string): ParsedRawDevice[] {
        const lines = output.split('\n');
        const results: ParsedRawDevice[] = [];

        for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line || line.startsWith('List of devices') || line.startsWith('* daemon')) {
                continue;
            }

            // e.g. "emulator-5554   device product:sdk_gphone64_x86_64 model:Pixel_8 device:emu64x transport_id:1"
            const parts = line.split(/\s+/);
            if (parts.length >= 2) {
                const serial = parts[0];
                const rawState = parts[1];

                let state: DeviceState = 'offline';
                if (rawState === 'device') {
                    state = 'online';
                } else if (rawState === 'offline') {
                    state = 'offline';
                } else if (rawState === 'unauthorized') {
                    state = 'unauthorized';
                } else if (rawState === 'bootloader' || rawState === 'connecting') {
                    state = 'booting';
                }

                const item: ParsedRawDevice = { serial, state };

                for (let i = 2; i < parts.length; i++) {
                    const token = parts[i];
                    const [key, value] = token.split(':');
                    if (key && value) {
                        if (key === 'product') {
                            item.product = value;
                        } else if (key === 'model') {
                            item.model = value.replace(/_/g, ' ');
                        } else if (key === 'device') {
                            item.device = value;
                        } else if (key === 'transport_id') {
                            item.transportId = value;
                        }
                    }
                }

                results.push(item);
            }
        }

        return results;
    }

    public static parseTrackDevicesLine(line: string): { serial: string; state: DeviceState } | null {
        const trimmed = line.trim();
        if (!trimmed) {
            return null;
        }

        const parts = trimmed.split(/\s+/);
        if (parts.length < 2) {
            return null;
        }

        const serial = parts[0];
        const rawState = parts[1];
        let state: DeviceState = 'offline';

        if (rawState === 'device') {
            state = 'online';
        } else if (rawState === 'offline') {
            state = 'offline';
        } else if (rawState === 'unauthorized') {
            state = 'unauthorized';
        } else if (rawState === 'connecting' || rawState === 'authorizing') {
            state = 'booting';
        }

        return { serial, state };
    }

    public static toDeviceModel(raw: ParsedRawDevice, avdName?: string): Device {
        const isEmulator = raw.serial.startsWith('emulator-');
        const isWifi = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+$/.test(raw.serial);
        const connection: ConnectionType = isWifi ? 'wifi' : 'usb';
        const type: DeviceType = isEmulator ? 'emulator' : 'physical';

        let name = raw.model || raw.serial;
        if (isEmulator && avdName) {
            name = avdName.replace(/_/g, ' ');
        } else if (isEmulator && !raw.model) {
            name = `Android Emulator (${raw.serial})`;
        } else if (isWifi && raw.model) {
            name = `${raw.model} (Wi-Fi)`;
        }

        return {
            id: raw.serial,
            name,
            type,
            state: raw.state,
            platform: 'android',
            isPhysical: !isEmulator,
            isEmulator,
            avdName,
            serial: raw.serial,
            connection,
            model: raw.model,
            networkAddress: isWifi ? raw.serial : undefined
        };
    }
}
