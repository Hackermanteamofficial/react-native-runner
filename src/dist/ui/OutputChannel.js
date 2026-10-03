"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutputChannelController = void 0;
const Logger_1 = require("../utils/Logger");
class OutputChannelController {
    static show() {
        Logger_1.Logger.getInstance().show();
    }
    static clear() {
        Logger_1.Logger.getInstance().clear();
    }
}
exports.OutputChannelController = OutputChannelController;
//# sourceMappingURL=OutputChannel.js.map