import * as cp from "node:child_process";

import * as vscode from "vscode";

interface Output {
  readonly file_path: string;
  readonly problems: readonly Problem[];
}

interface Problem {
  readonly location: Location;
  readonly message: string;
  readonly rule_doc_uri: string;
  readonly rule_id: string;
}

interface Location {
  readonly end_position: Position;
  readonly start_position: Position;
}

interface Position {
  readonly column_number: number;
  readonly line_number: number;
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null;

const isPosition = (value: unknown): value is Position =>
  isRecord(value) &&
  typeof value.column_number === "number" &&
  typeof value.line_number === "number";

const isLocation = (value: unknown): value is Location =>
  isRecord(value) && isPosition(value.end_position) && isPosition(value.start_position);

const isProblem = (value: unknown): value is Problem =>
  isRecord(value) &&
  isLocation(value.location) &&
  typeof value.message === "string" &&
  typeof value.rule_doc_uri === "string" &&
  typeof value.rule_id === "string";

const isOutputs = (value: unknown): value is readonly Output[] =>
  Array.isArray(value) &&
  value.every(
    (output: unknown) =>
      isRecord(output) &&
      typeof output.file_path === "string" &&
      Array.isArray(output.problems) &&
      output.problems.every(isProblem),
  );

const toRange = (location: Location): vscode.Range => {
  const start = new vscode.Position(
    location.start_position.line_number - 1,
    location.start_position.column_number - 1,
  );
  const end = new vscode.Position(
    location.end_position.line_number - 1,
    location.end_position.column_number - 1,
  );
  return new vscode.Range(start, end);
};

export interface APILinterOptions {
  channel: vscode.OutputChannel;
}

export class APILinter {
  readonly #channel: vscode.OutputChannel;
  #configFile?: string;
  #protoPaths: readonly string[] = [];
  #command: [string, ...string[]] = ["api-linter"];
  #workspacePath?: string;

  #isInstalled = false;
  #isInstallationChecked = false;

  #args: string[] = [];

  constructor(channel: vscode.OutputChannel) {
    this.#channel = channel;
  }

  setCommand(command: readonly string[]) {
    const [executable, ...args] = command;
    if (executable === undefined || executable === "") {
      return;
    }
    const nextCommand: [string, ...string[]] = [executable, ...args];
    if (nextCommand.join(" ") === this.#command.join(" ")) {
      return;
    }
    this.#command = nextCommand;
    this.#isInstallationChecked = false;
  }

  setConfigFile(configFile?: string) {
    if (configFile === this.#configFile) {
      return;
    }
    this.#configFile = configFile;
    this.#updateArguments();
  }

  setProtoPaths(protoPaths: readonly string[]) {
    if (protoPaths.join(",") === this.#protoPaths.join(",")) {
      return;
    }
    this.#protoPaths = protoPaths;
    this.#updateArguments();
  }

  setWorkspacePath(workspacePath: string) {
    this.#workspacePath = workspacePath;
  }

  isInstalled(): boolean {
    if (this.#isInstallationChecked) {
      return this.#isInstalled;
    }
    this.#isInstallationChecked = true;
    const result = cp.spawnSync(this.#command[0], [...this.#command.slice(1), "--version"], {
      cwd: this.#workspacePath,
      encoding: "utf-8",
    });
    this.#isInstalled = result.status === 0;
    return this.#isInstalled;
  }

  *lint(file: string): Iterable<vscode.Diagnostic> {
    this.#channel.appendLine(`Linting ${file}...`);
    this.#channel.appendLine(`Command: ${this.#command.join(" ")} ${file} ${this.#args.join(" ")}`);
    const result = cp.spawnSync(
      this.#command[0],
      [...this.#command.slice(1), file, ...this.#args],
      { cwd: this.#workspacePath, encoding: "utf-8" },
    );
    if (result.status === 0) {
      const output: unknown = JSON.parse(result.stdout);
      if (!isOutputs(output)) {
        return;
      }
      const [firstOutput] = output;
      if (output.length !== 1 || !firstOutput) {
        return;
      }

      for (const p of firstOutput.problems) {
        const problem = new vscode.Diagnostic(
          toRange(p.location),
          p.message,
          vscode.DiagnosticSeverity.Warning,
        );
        problem.code = {
          target: vscode.Uri.parse(p.rule_doc_uri),
          value: p.rule_id,
        };

        yield problem;
      }
    } else {
      const stderr = result.stderr.split(" ").slice(2).join(" ");
      this.#channel.appendLine(stderr);
      for (const line of stderr.split("\n")) {
        const [fileAndLine = "", ...messageParts] = line.split(" ");
        const [filePath, lineNo, column] = fileAndLine.split(":");
        const message = messageParts.join(" ");
        if (filePath === file) {
          yield new vscode.Diagnostic(
            new vscode.Range(
              Number(lineNo) - 1,
              Number(column),
              Number(lineNo) - 1,
              Number(column),
            ),
            message,
            vscode.DiagnosticSeverity.Error,
          );
        }
      }
    }
  }

  #updateArguments() {
    this.#args = ["--output-format", "json"];
    if (this.#configFile !== undefined && this.#configFile !== "") {
      this.#args.push("--config", this.#configFile);
    }
    for (const path of this.#protoPaths) {
      this.#args.push("-I", path);
    }
  }
}
