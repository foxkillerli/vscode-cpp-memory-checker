import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// This function is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {

    // --- STATIC ANALYSIS PART ---
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('cpp-memory-checker');
    const staticCheckCommand = vscode.commands.registerCommand('cpp-memory-checker.checkCurrentFile', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('No active editor found.');
            return;
        }

        const document = editor.document;
        if (document.languageId !== 'cpp' && document.languageId !== 'c') {
            vscode.window.showInformationMessage('This command is only available for C/C++ files.');
            return;
        }

        const filePath = document.uri.fsPath;
        diagnosticCollection.delete(document.uri);

        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Analyzing for memory leaks...",
            cancellable: false
        }, (progress) => {
            return new Promise<void>(resolve => {
                const command = `cppcheck --enable=warning,style,performance,portability --template='{file}:{line}:{column}:{severity}:{id}:{message}' "${filePath}"`;
                exec(command, (error, stdout, stderr) => {
                    if (error && error.code !== 0 && stderr.length > 0) {
                        const diagnostics: vscode.Diagnostic[] = [];
                        const lines = stderr.split('\n');
                        const regex = /^(.*?):(\d+):(\d+):(\w+):(\w+):(.*)$/;

                        for (const line of lines) {
                            const match = line.match(regex);
                            if (match) {
                                const [_, file, lineStr, colStr, severity, id, message] = match;
                                const lineNumber = parseInt(lineStr, 10) - 1;
                                const columnNumber = parseInt(colStr, 10) - 1;
                                const range = new vscode.Range(lineNumber, columnNumber, lineNumber, 100); 
                                
                                let diagnosticSeverity: vscode.DiagnosticSeverity;
                                switch (severity) {
                                    case 'error': diagnosticSeverity = vscode.DiagnosticSeverity.Error; break;
                                    case 'warning': diagnosticSeverity = vscode.DiagnosticSeverity.Warning; break;
                                    default: diagnosticSeverity = vscode.DiagnosticSeverity.Information; break;
                                }

                                const diagnostic = new vscode.Diagnostic(range, `[${id}] ${message.trim()}`, diagnosticSeverity);
                                diagnostic.source = 'C++ Memory Checker (cppcheck)';
                                diagnostics.push(diagnostic);
                            }
                        }
                        diagnosticCollection.set(document.uri, diagnostics);
                        vscode.window.showInformationMessage('Static analysis complete. Problems found.');
                    } else {
                        vscode.window.showInformationMessage('Static analysis complete. No problems found.');
                    }
                    resolve();
                });
            });
        });
    });

    // --- RUNTIME ANALYSIS PART ---
    const configureRuntimeCheckCommand = vscode.commands.registerCommand('cpp-memory-checker.configureForRuntimeCheck', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage("Please open a folder or workspace to configure runtime analysis.");
            return;
        }
        const workspacePath = workspaceFolders[0].uri.fsPath;
        const vscodePath = path.join(workspacePath, '.vscode');

        try {
            if (!fs.existsSync(vscodePath)) {
                fs.mkdirSync(vscodePath);
            }

            // --- Configure tasks.json ---
            const tasksPath = path.join(vscodePath, 'tasks.json');
            let tasksConfig = { version: '2.0.0', tasks: [] as any[] };

            if (fs.existsSync(tasksPath)) {
                const content = fs.readFileSync(tasksPath, 'utf8');
                try {
                    // Correctly escaped regex to remove comments from JSON
                    const jsonContent = content.replace(/\/\/[^\n\r]*|\/\*[\s\S]*?\*\//g, '');
                    if (jsonContent.trim() === '') {
                        tasksConfig = { version: '2.0.0', tasks: [] as any[] };
                    } else {
                        tasksConfig = JSON.parse(jsonContent);
                    }
                    if (!tasksConfig.tasks) {
                        tasksConfig.tasks = [];
                    }
                } catch (e) {
                    vscode.window.showErrorMessage("Your tasks.json file seems to be corrupted. Please fix it or delete it.");
                    return;
                }
            }

            const asanBuildTask = {
                label: "C++: build with AddressSanitizer",
                type: "shell",
                command: "g++",
                args: [
                    "-g", // Include debug symbols
                    "-fsanitize=address", // Enable AddressSanitizer
                    "${file}",
                    "-o",
                    "${fileDirname}/${fileBasenameNoExtension}.asan"
                ],
                group: {
                    kind: "build",
                    isDefault: true
                },
                problemMatcher: ["$gcc"]
            };

            const taskExists = tasksConfig.tasks.some(task => task.label === asanBuildTask.label);
            if (!taskExists) {
                tasksConfig.tasks.push(asanBuildTask);
                fs.writeFileSync(tasksPath, JSON.stringify(tasksConfig, null, 4));
                vscode.window.showInformationMessage("Build task 'C++: build with AddressSanitizer' was added to tasks.json.");
            } else {
                vscode.window.showInformationMessage("Build task 'C++: build with AddressSanitizer' already exists in tasks.json.");
            }

            // --- Configure launch.json ---
            const launchPath = path.join(vscodePath, 'launch.json');
            let launchConfig = { version: '0.2.0', configurations: [] as any[] };

            if (fs.existsSync(launchPath)) {
                const content = fs.readFileSync(launchPath, 'utf8');
                try {
                    // Correctly escaped regex to remove comments from JSON
                    const jsonContent = content.replace(/\/\/[^\n\r]*|\/\*[\s\S]*?\*\//g, '');
                     if (jsonContent.trim() === '') {
                        launchConfig = { version: '0.2.0', configurations: [] as any[] };
                    } else {
                        launchConfig = JSON.parse(jsonContent);
                    }
                    if (!launchConfig.configurations) {
                        launchConfig.configurations = [];
                    }
                } catch (e) {
                    vscode.window.showErrorMessage("Your launch.json file seems to be corrupted. Please fix it or delete it.");
                    return;
                }
            }

            const asanLaunchConfig = {
                name: "C++: Run with AddressSanitizer",
                type: "cppdbg",
                request: "launch",
                program: "${fileDirname}/${fileBasenameNoExtension}.asan",
                args: [],
                stopAtEntry: false,
                cwd: "${fileDirname}",
                environment: [],
                externalConsole: false,
                console: "integratedTerminal",
                MIMode: "gdb",
                preLaunchTask: "C++: build with AddressSanitizer"
            };

            const launchExists = launchConfig.configurations.some(config => config.name === asanLaunchConfig.name);
            if (!launchExists) {
                launchConfig.configurations.push(asanLaunchConfig);
                fs.writeFileSync(launchPath, JSON.stringify(launchConfig, null, 4));
                vscode.window.showInformationMessage("Launch configuration 'C++: Run with AddressSanitizer' was added to launch.json.");
            } else {
                vscode.window.showInformationMessage("Launch configuration 'C++: Run with AddressSanitizer' already exists in launch.json.");
            }

        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to configure runtime analysis: ${error.message}`);
        }
    });

    context.subscriptions.push(staticCheckCommand, configureRuntimeCheckCommand);
}

// This function is called when your extension is deactivated
export function deactivate() {}
