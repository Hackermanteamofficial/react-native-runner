import { Device } from './Device';

/**
 * State machine states for the run process
 */
export type RunState =
    | 'IDLE'
    | 'CHECKING'
    | 'DEVICE_SELECTED'
    | 'STARTING_DEVICE'
    | 'DEVICE_READY'
    | 'CHECKING_BUILD'
    | 'BUILDING'
    | 'METRO_STARTING'
    | 'INSTALLING'
    | 'METRO_READY'
    | 'LAUNCHING'
    | 'RUNNING'
    | 'ERROR';

/**
 * Events driving state transitions
 */
export type RunEvent =
    | { type: 'START_RUN'; device?: Device }
    | { type: 'SELECT_DEVICE'; device: Device }
    | { type: 'DEVICE_BOOTED'; device: Device }
    | { type: 'BUILD_REQUIRED' }
    | { type: 'BUILD_SKIPPED' }
    | { type: 'BUILD_SUCCESS'; apkPath: string }
    | { type: 'BUILD_FAILURE'; error: string }
    | { type: 'METRO_READY'; port: number }
    | { type: 'APP_LAUNCHED' }
    | { type: 'STOP' }
    | { type: 'RESET' }
    | { type: 'FAIL'; error: string };

export interface RunMachineContext {
    device?: Device;
    apkPath?: string;
    metroPort?: number;
    error?: string;
    startTime?: number;
}
