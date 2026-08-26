import * as cp from "node:child_process";

import * as vscode from "vscode";

interface Output {
  file_path: string;
  problems: Problem[];
}

interface Problem {
  location: Location;
  message: string;
  rule_doc_uri: string;
  rule_id: string;
}

interface Location {
  end_position: Position;
  start_position: Position;
}

interface Position {
  column_number: number;
  line_number: number;
}

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
  #protoPaths: string[] = [];
  #command: [string, ...string[]] = ["api-linter"];
  #workspacePath?: string;

  #isInstalled = false;
  #isInstallationChecked = false;

  #args: string[] = [];

  constructor(channel: vscode.OutputChannel) {
    this.#channel = channel;
  }

  setCommand(command: string[]) {
    const [executable, ...args] = command;
    if (!executable) {
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

  setProtoPaths(protoPaths: string[]) {
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
      const output: Output[] = JSON.parse(result.stdout);
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
      const stderr = result.stderr.toString().split(" ").slice(2).join(" ");
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
    if (this.#configFile) {
      this.#args.push("--config", this.#configFile);
    }
    for (const path of this.#protoPaths) {
      this.#args.push("-I", path);
    }
  }
}
