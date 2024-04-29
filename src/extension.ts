import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { APILinter } from "./api-linter";

const diagnostics = vscode.languages.createDiagnosticCollection("apiLinter");

function findConfigFile(
  workspaceDir: string,
  configFilePath: string
): string | undefined {
  if (path.isAbsolute(configFilePath) && fs.existsSync(configFilePath)) {
    return configFilePath;
  }
  configFilePath = path.join(workspaceDir, configFilePath);
  if (fs.existsSync(configFilePath)) {
    return configFilePath;
  }
}

export function activate() {
  const channel = vscode.window.createOutputChannel("API Linter");
  const linter = new APILinter(channel);

  vscode.commands.registerCommand("apiLinter.lint", () => {
    let editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    const doc = editor.document;
    switch (doc.languageId) {
      case "proto3":
      case "proto":
        break;
      default:
        return;
    }

    const workspaceFolder = vscode.workspace.getWorkspaceFolder(doc.uri);
    if (!workspaceFolder) {
      vscode.window.showErrorMessage(
        "Cannot lint an unsaved file. Save the file in your workspace and try again."
      );
      return;
    }

    const config = vscode.workspace.getConfiguration("apiLinter");

    // Set the command and workspace and check for existence.
    linter.setWorkspacePath(workspaceFolder.uri.fsPath);
    linter.setCommand(config.get("command") as string[]);
    if (!linter.isInstalled()) {
      vscode.window.showErrorMessage(
        "`api-linter` is not installed. Follow the instructions here: https://linter.aip.dev/#installation"
      );
      return;
    }

    // Set other options.
    linter.setConfigFile(
      findConfigFile(
        workspaceFolder.uri.fsPath,
        config.get("configFile") as string
      )
    );
    linter.setProtoPaths(config.get("protoPaths") as string[]);

    // Lint the file.
    const filePath = vscode.workspace.asRelativePath(doc.uri, false);
    diagnostics.set(doc.uri, [...linter.lint(filePath)]);
  });

  vscode.workspace.onDidSaveTextDocument(() => {
    vscode.commands.executeCommand("apiLinter.lint");
  });
}

export function deactivate() {
  diagnostics.clear();
}
