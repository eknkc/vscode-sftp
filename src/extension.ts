'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';

import * as output from './modules/output';
import { CONGIF_FILENAME } from './constants';

import { initConfigs, loadConfig } from './modules/config';
// TODO
import { endAllRemote } from './modules/remoteFs';
import { watchWorkspace, watchFiles, clearAllWatcher } from './modules/fileWatcher';
// import traceFileActivities from './modules/fileActivities.js';
import { sync2RemoteCommand, sync2LocalCommand, uploadCommand, downloadCommand } from './commands/sync';
import { listCommand, listAllCommand } from './commands/list';
import editConfig from './commands/config';
import autoSave from './commands/auto-save';
import {
  SYNC_TO_REMOTE,
  SYNC_TO_LOCAL,
  UPLOAD,
  DOWNLOAD,
  CONFIG,
  LIST_DEFAULT,
  LIST_ALL,
} from './constants';
import { getWorkspaceFolders } from './host';

function registerCommand(
  context: vscode.ExtensionContext,
  name: string,
  callback: (args: any[]) => any,
  thisArg?: any
) {
  const disposable = vscode.commands.registerCommand(name, callback, thisArg);
  context.subscriptions.push(disposable);
}

function handleConfigSave(uri: vscode.Uri) {
  loadConfig(uri.fsPath)
    .then(watchFiles, output.onError);
}

function handleDocumentSave(uri: vscode.Uri) {
  autoSave(uri);
};

function setupWorkspaceFolder(dir) {
  return initConfigs(dir).then(watchFiles);
}

function setup() {
  watchWorkspace({
    onDidSaveFile: handleDocumentSave,
    onDidSaveSftpConfig: handleConfigSave,
  });

  const workspaceFolders = getWorkspaceFolders();
  const pendingInits = workspaceFolders.map(folder => setupWorkspaceFolder(folder.uri.fsPath));

  return Promise.all(pendingInits);
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  registerCommand(context, CONFIG, editConfig);
  registerCommand(context, LIST_DEFAULT, listCommand);
  registerCommand(context, LIST_ALL, listAllCommand);
  registerCommand(context, SYNC_TO_REMOTE, sync2RemoteCommand);
  registerCommand(context, SYNC_TO_LOCAL, sync2LocalCommand);
  registerCommand(context, UPLOAD, uploadCommand);
  registerCommand(context, DOWNLOAD, downloadCommand);

  const workspaceFolders = getWorkspaceFolders();
  if (!workspaceFolders) {
    return;
  }

  output.status.msg('SFTP init...');
  setup()
    .then(_ => {
      output.status.msg('SFTP Ready', 1000 * 8);
    })
    .catch(output.onError);
}

export function deactivate() {
  clearAllWatcher();
  endAllRemote();
}
