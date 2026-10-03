import { EventEmitter } from 'events';
import { RunState, RunEvent, RunMachineContext } from '../types/State';
import { Logger } from '../utils/Logger';

type TransitionListener = (from: RunState, to: RunState, context: RunMachineContext) => void;

export class RunStateMachine extends EventEmitter {
    private static instance: RunStateMachine;
    private state: RunState = 'IDLE';
    private context: RunMachineContext = {};
    private logger = Logger.getInstance();

    /**
     * Formal transition table enforcing strict validity of state changes
     */
    private readonly transitions: Record<RunState, Partial<Record<RunEvent['type'], RunState>>> = {
        IDLE: {
            START_RUN: 'CHECKING',
            SELECT_DEVICE: 'DEVICE_SELECTED',
            RESET: 'IDLE'
        },
        CHECKING: {
            SELECT_DEVICE: 'DEVICE_SELECTED',
            FAIL: 'ERROR',
            STOP: 'IDLE',
            RESET: 'IDLE'
        },
        DEVICE_SELECTED: {
            START_RUN: 'CHECKING_BUILD',
            DEVICE_BOOTED: 'DEVICE_READY',
            FAIL: 'ERROR',
            STOP: 'IDLE',
            RESET: 'IDLE'
        },
        STARTING_DEVICE: {
            DEVICE_BOOTED: 'DEVICE_READY',
            FAIL: 'ERROR',
            STOP: 'IDLE',
            RESET: 'IDLE'
        },
        DEVICE_READY: {
            START_RUN: 'CHECKING_BUILD',
            BUILD_REQUIRED: 'BUILDING',
            BUILD_SKIPPED: 'METRO_STARTING',
            FAIL: 'ERROR',
            STOP: 'IDLE',
            RESET: 'IDLE'
        },
        CHECKING_BUILD: {
            BUILD_REQUIRED: 'BUILDING',
            BUILD_SKIPPED: 'METRO_STARTING',
            FAIL: 'ERROR',
            STOP: 'IDLE',
            RESET: 'IDLE'
        },
        BUILDING: {
            BUILD_SUCCESS: 'INSTALLING',
            BUILD_FAILURE: 'ERROR',
            FAIL: 'ERROR',
            STOP: 'IDLE',
            RESET: 'IDLE'
        },
        INSTALLING: {
            METRO_READY: 'LAUNCHING',
            FAIL: 'ERROR',
            STOP: 'IDLE',
            RESET: 'IDLE'
        },
        METRO_STARTING: {
            METRO_READY: 'LAUNCHING',
            FAIL: 'ERROR',
            STOP: 'IDLE',
            RESET: 'IDLE'
        },
        METRO_READY: {
            APP_LAUNCHED: 'RUNNING',
            FAIL: 'ERROR',
            STOP: 'IDLE',
            RESET: 'IDLE'
        },
        LAUNCHING: {
            APP_LAUNCHED: 'RUNNING',
            FAIL: 'ERROR',
            STOP: 'IDLE',
            RESET: 'IDLE'
        },
        RUNNING: {
            START_RUN: 'CHECKING',
            STOP: 'IDLE',
            FAIL: 'ERROR',
            RESET: 'IDLE'
        },
        ERROR: {
            START_RUN: 'CHECKING',
            RESET: 'IDLE',
            STOP: 'IDLE'
        }
    };

    private constructor() {
        super();
    }

    public static getInstance(): RunStateMachine {
        if (!RunStateMachine.instance) {
            RunStateMachine.instance = new RunStateMachine();
        }
        return RunStateMachine.instance;
    }

    public getState(): RunState {
        return this.state;
    }

    public getContext(): RunMachineContext {
        return { ...this.context };
    }

    public transition(event: RunEvent): RunState {
        const allowedTransitions = this.transitions[this.state];
        const nextState = allowedTransitions ? allowedTransitions[event.type] : undefined;

        if (!nextState) {
            this.logger.warn(`Illegal state machine transition: Cannot handle event "${event.type}" from current state "${this.state}".`);
            return this.state;
        }

        const prevState = this.state;
        this.updateContext(event);
        this.state = nextState;

        this.logger.debug(`[StateMachine] ${prevState} -> ${nextState} (Event: ${event.type})`);
        this.emit('transition', prevState, nextState, this.context);

        return this.state;
    }

    private updateContext(event: RunEvent): void {
        switch (event.type) {
            case 'START_RUN':
                if (event.device) {
                    this.context.device = event.device;
                }
                this.context.startTime = Date.now();
                this.context.error = undefined;
                break;
            case 'SELECT_DEVICE':
            case 'DEVICE_BOOTED':
                this.context.device = event.device;
                break;
            case 'BUILD_SUCCESS':
                this.context.apkPath = event.apkPath;
                break;
            case 'BUILD_FAILURE':
            case 'FAIL':
                this.context.error = event.error;
                break;
            case 'METRO_READY':
                this.context.metroPort = event.port;
                break;
            case 'RESET':
            case 'STOP':
                this.context = {};
                break;
        }
    }

    public reset(): void {
        this.transition({ type: 'RESET' });
    }

    public onTransition(listener: TransitionListener): void {
        this.on('transition', listener);
    }
}
