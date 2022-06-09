import { ExtensionContext, OutputChannel, window, workspace } from 'coc.nvim';
import { Config } from './config';
import * as omnisharp from './omnisharp/main';

declare global {
  var logger: OutputChannel;
}

export async function activate(context: ExtensionContext): Promise<void> {
  logger = window.createOutputChannel('coc-csharp');
  logger.appendLine(`activating coc-csharp...`);
  logger.appendLine(`workspace root: ${workspace.root}`);

  const config = new Config();

  // register omnisharp
  await omnisharp.activate(config, context);

  logger.appendLine(`activated coc-csharp.`);
}
