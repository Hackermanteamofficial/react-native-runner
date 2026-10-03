import { Logger } from '../utils/Logger';

export class OutputChannelController {
    public static show(): void {
        Logger.getInstance().show();
    }

    public static clear(): void {
        Logger.getInstance().clear();
    }
}
