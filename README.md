# API Linter for Visual Studio Code

Lint Protobuf API files using [API Linter](https://linter.aip.dev) in Visual Studio Code.

## Overview

[API Linter](https://linter.aip.dev) is a linter developed by Google for linting APIs written in [Protocol Buffers](https://developers.google.com/protocol-buffers). It enforces the [Google API Improvement Proposals (AIPs)](https://aip.dev), a set of design guidelines for APIs.

This extension integrates `api-linter` directly into VS Code, providing inline diagnostics as you edit and save `.proto` files.

## Requirements

You must have one of the following available:

- [`api-linter`](https://linter.aip.dev/#installation) installed and on your `PATH`, or
- A custom proxy command (e.g. `bazel run api-linter --`) configured via `apiLinter.command`.

## Installation

Install this extension from the [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=mathematic.mathematic-vscode-api-linter) by searching for **"API Linter"** (publisher: `mathematic`).

Alternatively, install the `api-linter` CLI tool by following the [official installation instructions](https://linter.aip.dev/#installation).

## Features

- **Automatic linting on save**: The extension automatically lints the active `.proto` file whenever it is saved.
- **Manual lint command**: Run the `API Linter: Lint the current file` command from the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) to lint on demand.
- **Inline diagnostics**: Violations are shown as inline errors and warnings directly in the editor.
- **Configurable**: All functional flags are exposed through the extension's configuration settings.

## Configuration

The following settings are available under the `apiLinter` namespace in VS Code settings:

| Setting | Type | Default | Description |
|---|---|---|---|
| `apiLinter.command` | `array` | `["api-linter"]` | Command to run for API linter. Use this to specify a custom binary or proxy command. |
| `apiLinter.configFile` | `string` | `".apilinter.yml"` | Path to a config file for API linter. If the file does not exist, no config will be used. |
| `apiLinter.protoPaths` | `array` | `[]` | Include paths to use for proto imports. |

### Example: Using a Bazel proxy

```json
{
  "apiLinter.command": ["bazel", "run", "//tools:api-linter", "--"]
}
```

### Example: Custom proto include paths

```json
{
  "apiLinter.protoPaths": ["vendor/proto", "third_party/proto"]
}
```

## Usage

1. Open a `.proto` file in VS Code.
2. The extension activates automatically for `proto` and `proto3` language files.
3. Save the file to trigger automatic linting, or use the Command Palette to run `API Linter: Lint the current file`.
4. Lint violations appear as diagnostics in the editor and in the **Problems** panel.

## Repository

Source code is available at [github.com/mathematic-inc/vscode-api-linter](https://github.com/mathematic-inc/vscode-api-linter).

Issues and feature requests can be filed at [github.com/mathematic-inc/vscode-api-linter/issues](https://github.com/mathematic-inc/vscode-api-linter/issues).

## License

[Apache-2.0](https://github.com/mathematic-inc/vscode-api-linter/blob/main/LICENSE)

> This project is free and open-source work by a 501(c)(3) non-profit. If you find it useful, please consider [donating](https://github.com/sponsors/mathematic-inc).
