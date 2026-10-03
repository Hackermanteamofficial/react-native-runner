import * as child_process from 'child_process';
import * as vscode from 'vscode';

export interface ProcessRunOptions {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    timeoutMs?: number;
    cancellationToken?: vscode.CancellationToken;
    onStdout?: (data: string) => void;
    onStderr?: (data: string) => void;
    shell?: boolean;
}

export interface ProcessRunResult {
    exitCode: number;
    stdout: string;
    stderr: string;
}

export class ProcessRunner {
    public static async run(
        command: string,
        args: string[] = [],
        options: ProcessRunOptions = {}
    ): Promise<ProcessRunResult> {
        return new Promise<ProcessRunResult>((resolve, reject) => {
            const mergedEnv = { ...process.env, ...(options.env || {}) };
            const spawnOptions: child_process.SpawnOptions = {
                cwd: options.cwd,
                env: mergedEnv,
                shell: options.shell !== undefined ? options.shell : process.platform === 'win32'
            };

            let child: child_process.ChildProcess;
            try {
                child = child_process.spawn(command, args, spawnOptions);
            } catch (err) {
                return reject(err);
            }

            let stdout = '';
            let stderr = '';
            let isTimedOut = false;
            let timeoutId: NodeJS.Timeout | undefined;

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

            child.stdout?.on('data', (data: Buffer) => {
                const text = data.toString();
                stdout += text;
                options.onStdout?.(text);
            });

            child.stderr?.on('data', (data: Buffer) => {
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

    public static async exec(
        commandLine: string,
        options: ProcessRunOptions = {}
    ): Promise<ProcessRunResult> {
        return new Promise<ProcessRunResult>((resolve, reject) => {
            const mergedEnv = { ...process.env, ...(options.env || {}) };
            const execOptions: child_process.ExecOptions = {
                cwd: options.cwd,
                env: mergedEnv,
                timeout: options.timeoutMs || 0
            };

            let cancellationDisposable: vscode.Disposable | undefined;

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

            child.stdout?.on('data', (data: string) => {
                options.onStdout?.(data);
            });

            child.stderr?.on('data', (data: string) => {
                options.onStderr?.(data);
            });
        });
    }
}
