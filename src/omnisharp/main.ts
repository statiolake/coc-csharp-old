import {
  ILanguageServerPackages,
  LanguageServerRepository,
  ServerInstaller,
  sleep,
} from 'coc-utils';
import {
  commands,
  ExtensionContext,
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  window,
  workspace,
} from 'coc.nvim';
import fs from 'fs';
import path from 'path';
import { Config } from '../config';

export async function activate(
  config: Config,
  extctx: ExtensionContext
): Promise<void> {
  const solutionFile = findSolution();
  if (!solutionFile) {
    logger.appendLine('Solution not found. Cannot start server.');
    await window.showErrorMessage(
      'Solution not found. Cannot start omnisharp.'
    );
    return;
  }

  logger.appendLine(`Solution file is: ${solutionFile}`);

  const customPath = config.omnisharpCustomPath;
  const version = config.omnisharpVersion;
  const installer = new ServerInstaller(
    'OmniSharp',
    extctx,
    getPacks(),
    getRepo(version),
    customPath
  );
  const args = generateServerArgs(config, solutionFile);

  const result = await installer.ensureInstalled(true, true);
  if (!result.available) return;

  const serverOpts = createServerOptions(result.path, args);
  const clientOpts = createClientOptions();

  // Create the language client and start the client.
  const client = createLanguageClient(serverOpts, clientOpts);
  extctx.subscriptions.push(client.start());

  registerCommands(config, client, extctx, installer);

  registerStatusBarItem();
}

function createClientOptions(): LanguageClientOptions {
  const omnisharpLogger = window.createOutputChannel('omnisharp');
  return {
    // Register the server for C#/VB documents
    documentSelector: [{ scheme: 'file', language: 'cs' }],
    synchronize: {
      configurationSection: 'omnisharp',
      fileEvents: [
        workspace.createFileSystemWatcher('**/*.cs'),
        workspace.createFileSystemWatcher('**/*.csx'),
        workspace.createFileSystemWatcher('**/*.cake'),
      ],
    },
    outputChannel: omnisharpLogger,
  };
}

function findSolution(): string | undefined {
  return fs
    .readdirSync(workspace.root)
    .map((x) => path.join(workspace.root, x))
    .find((x) => x.endsWith('.sln') && fs.statSync(x).isFile());
}

function generateServerArgs(config: Config, slnFile: string): string[] {
  const loglevel = config.omnisharpTraceServer;

  const args = ['-lsp'];
  if (slnFile !== undefined) {
    args.push('-s');
    args.push(slnFile);
  }

  if (loglevel === 'verbose') {
    args.push('-v');
    logger.appendLine('Verbose mode enabled for OmniSharp.');
  }

  return args;
}

function createServerOptions(
  serverPath: string,
  args: string[]
): ServerOptions {
  return {
    command: serverPath,
    args: args,
    options: { cwd: workspace.root },
  };
}

function createLanguageClient(
  serverOpts: ServerOptions,
  clientOpts: LanguageClientOptions
): LanguageClient {
  return new LanguageClient(
    'omnisharp',
    'OmniSharp Language Server',
    serverOpts,
    clientOpts
  );
}

function registerCommands(
  config: Config,
  client: LanguageClient,
  extctx: ExtensionContext,
  installer: ServerInstaller
): void {
  extctx.subscriptions.push(
    commands.registerCommand('omnisharp.installServer', async () => {
      if (installer.isCustomPath) {
        window.showWarningMessage(
          `Configured to use custom executable (${config.omnisharpCustomPath}),` +
            ' the downloaded bundle will have no effect'
        );
      }

      if (client.needsStop()) {
        client.stop();
        await sleep(200);
      }
      await installer.install();

      extctx.subscriptions.push(client.start());
    })
  );

  extctx.subscriptions.push(
    commands.registerCommand('omnisharp.checkUpdate', async () => {
      await installer.ensureUpdated(true, true, true);
    })
  );
}

function registerStatusBarItem() {
  const item = window.createStatusBarItem();
  item.text = 'OmniSharp';
  item.show();
}

function getRepo(version: string): LanguageServerRepository {
  return {
    kind: 'github',
    repo: 'OmniSharp/omnisharp-roslyn',
    channel: version === 'latest' ? version : `tags/${version}`,
  };
}

function getPacks(): ILanguageServerPackages {
  return {
    'win-x64': {
      platformFilename: 'omnisharp-win-x64.zip',
      executable: 'Omnisharp.exe',
      archiver: 'zip',
    },
    'linux-x64': {
      platformFilename: 'omnisharp-linux-x64.zip',
      executable: 'run',
      archiver: 'zip',
    },
    'osx-x64': {
      platformFilename: 'omnisharp-osx.zip',
      executable: 'run',
      archiver: 'zip',
    },
  };
}
