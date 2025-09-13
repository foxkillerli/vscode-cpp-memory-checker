# C++ Memory Checker

A Visual Studio Code extension designed to help C++ developers detect potential memory leaks through both static and runtime analysis.

## Features

- **Static Analysis**: Integrates `cppcheck` to scan your code without executing it, identifying potential memory leaks and other common programming errors.
- **Runtime Analysis**: Utilizes the powerful AddressSanitizer (ASan) from GCC/Clang to detect memory leaks accurately when you run or debug your program.

## Prerequisites

Before using this extension, please ensure you have the following tools installed and available in your system's PATH:

1.  **A C++ Compiler**: `g++` or `clang++` that supports AddressSanitizer.
2.  **cppcheck**: The static analysis tool.

    ```bash
    # On Debian/Ubuntu
    sudo apt-get update && sudo apt-get install -y g++ cppcheck
    ```

## How to Use

### 1. Static Analysis

This feature checks your currently open file for potential issues.

1.  Open any C or C++ file (`.c`, `.cpp`).
2.  Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on Mac).
3.  Type and select **`C++ Memory Check: Analyze Current File`**.
4.  Any potential issues found by `cppcheck` will appear with squiggly lines in your code and will be listed in the **Problems** panel (`Ctrl+Shift+M`).

### 2. Runtime Analysis

This feature configures your project for compilation and debugging with AddressSanitizer to find actual leaks at runtime.

**Step A: One-Time Configuration**

1.  Open the Command Palette (`Ctrl+Shift+P`).
2.  Type and select **`C++ Memory Check: Configure for Runtime Analysis`**.
3.  This will automatically create or update `tasks.json` and `launch.json` inside your project's `.vscode` folder.

**Step B: Running the Analysis**

1.  Open the C++ file you want to test (e.g., `test.cpp`).
2.  Go to the **Run and Debug** view from the side bar.
3.  From the configuration dropdown at the top, select **`C++: Run with AddressSanitizer`**.
4.  Press the green play button (or `F5`) to start debugging.
5.  Once your program finishes, check the **Debug Console** panel for a detailed memory leak report from AddressSanitizer.

## How It Works

- **Static Analysis**: The extension runs the `cppcheck` command-line tool on the active file. It uses a custom output template to reliably parse the results and transform them into VS Code Diagnostics.

- **Runtime Analysis**: The extension automates the setup process by:
    1.  Creating a **build task** in `tasks.json` that compiles your code using `g++` with the `-g` and `-fsanitize=address` flags.
    2.  Creating a **launch configuration** in `launch.json` that specifies the instrumented executable and links it to the build task.

## License

This project is licensed under the MIT License.
