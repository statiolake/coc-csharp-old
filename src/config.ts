import { workspace, WorkspaceConfiguration } from 'coc.nvim';

export class Config {
  public get omnisharpVersion(): string {
    return this.omnisharpConfig.get<string>('version', 'latest');
  }

  public get omnisharpCustomPath(): string | undefined {
    return this.omnisharpConfig.get('path');
  }

  public get omnisharpTraceServer(): string | undefined {
    return this.omnisharpConfig.get('trace.server');
  }

  private get omnisharpConfig(): WorkspaceConfiguration {
    return workspace.getConfiguration('omnisharp');
  }
}
