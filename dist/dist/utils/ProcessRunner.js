"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessRunner = void 0;
const child_process = __importStar(require("child_process"));
class ProcessRunner {
    static async run(command, args = [], options = {}) {
        return new Promise((resolve, reject) => {
            const mergedEnv = { ...process.env, ...(options.env || {}) };
            const spawnOptions = {
                cwd: options.cwd,
                env: mergedEnv,
                shell: options.shell !== undefined ? options.shell : process.platform === 'win32'
            };
            let child;
            try {
                child = child_process.spawn(command, args, spawnOptions);
            }
            catch (err) {
                return reject(err);
            }
            let stdout = '';
            let stderr = '';
            let isTimedOut = false;
            let timeoutId;
            if (options.timeoutMs && options.timeoutMs > 0) {
                timeoutId = setTimeout(() => {
                    isTimedOut = true;
                    child.kill('SIGTERM');
                    setTimeout(() => {
                        if (!child.killed) {
                            child.kill('SIGKILL');
                        }
                    }, 2000);
                }, options.timeoutMs);
            }
            const cancellationDisposable = options.cancellationToken?.onCancellationRequested(() => {
                child.kill('SIGTERM');
            });
            child.stdout?.on('data', (data) => {
                const text = data.toString();
                stdout += text;
                options.onStdout?.(text);
            });
            child.stderr?.on('data', (data) => {
                const text = data.toString();
                stderr += text;
                options.onStderr?.(text);
            });
            child.on('error', (err) => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                cancellationDisposable?.dispose();
                reject(err);
            });
            child.on('close', (code) => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                cancellationDisposable?.dispose();
                if (isTimedOut) {
                    return reject(new Error(`Command timed out after ${options.timeoutMs}ms: ${command} ${args.join(' ')}`));
                }
                resolve({
                    exitCode: code ?? 0,
                    stdout: stdout.trim(),
                    stderr: stderr.trim()
                });
            });
        });
    }
    static async exec(commandLine, options = {}) {
        return new Promise((resolve, reject) => {
            const mergedEnv = { ...process.env, ...(options.env || {}) };
            const execOptions = {
                cwd: options.cwd,
                env: mergedEnv,
                timeout: options.timeoutMs || 0
            };
            let cancellationDisposable;
            const child = child_process.exec(commandLine, execOptions, (error, stdout, stderr) => {
                cancellationDisposable?.dispose();
                if (error && error.killed) {
                    return reject(new Error(`Command was cancelled or timed out: ${commandLine}`));
                }
                resolve({
                    exitCode: error?.code ?? 0,
                    stdout: String(stdout || '').trim(),
                    stderr: String(stderr || '').trim()
                });
            });
            cancellationDisposable = options.cancellationToken?.onCancellationRequested(() => {
                child.kill();
            });
            child.stdout?.on('data', (data) => {
                options.onStdout?.(data);
            });
            child.stderr?.on('data', (data) => {
                options.onStderr?.(data);
            });
        });
    }
}
exports.ProcessRunner = ProcessRunner;
//# sourceMappingURL=ProcessRunner.js.map