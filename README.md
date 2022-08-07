# API Linter for Visual Studio Code

Lint Protobuf API files using [API Linter](https://linter.aip.dev) in Visual Studio Code.

## Overview

[API Linter](https://linter.aip.dev) is a linter developed by Google for linting their APIs written in [Protocol Buffers](https://developers.google.com/protocol-buffers).

## Requirements

You must either,

- have [`api-linter`](https://linter.aip.dev/#installation) installed or
- a proxy command (e.g. `bazel run api-linter --` customized in `apiLinter.command`).

## Features

This extension exposes all functional flags through its configuration. For more information, see the `package.json` or check your settings for configurations under `apiLinter`.
