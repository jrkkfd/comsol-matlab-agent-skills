# Local MATLAB MCP setup

## Verified installation

- MATLAB root: `D:\APP\matlab2025b here`
- MATLAB executable: `D:\APP\matlab2025b here\bin\matlab.exe`
- Release verified through MCP: `25.2.0.2998904 (R2025b)`
- MCP binary: `D:\D Document\Matlab 2\tools\matlab-mcp-server-windows-x64.exe`
- MCP version verified: `github.com/matlab/matlab-mcp-server v0.11.2`
- Official repository: `https://github.com/matlab/matlab-mcp-server`
- Global Codex config: `C:\Users\33041\.codex\config.toml`

The MCP binary SHA-256 recorded during setup is:

```text
F51A440C00F2031B317D90027FA554C5813B20E553F69484278E3ABDF4C5A206
```

## Codex configuration

```toml
[mcp_servers.matlab]
command = 'D:\D Document\Matlab 2\tools\matlab-mcp-server-windows-x64.exe'
args = ['--matlab-root=D:\APP\matlab2025b here', '--initial-working-folder=D:\D Document\Matlab 2', '--matlab-display-mode=nodesktop', '--matlab-session-mode=new', '--disable-telemetry=true']

[mcp_servers.matlab.env]
WINDIR = 'C:\Windows'
```

Restart Codex after changing MCP configuration. Windows Codex must pass `WINDIR` to MATLAB.

To inspect this config from an ordinary PowerShell that does not define `CODEX_HOME`:

```powershell
$env:CODEX_HOME = 'C:\Users\33041\.codex'
codex mcp get matlab
```

## Bundled client overrides

`scripts/matlab-mcp-run.mjs` uses the verified paths above by default. Override them when installations move:

```powershell
$env:MATLAB_MCP_SERVER = 'C:\path\to\matlab-mcp-server-windows-x64.exe'
$env:MATLAB_ROOT = 'C:\Program Files\MATLAB\R2025b'
```

Optional client flags:

```text
--server=<absolute MCP binary path>
--matlab-root=<MATLAB root without bin>
--project=<initial MATLAB working folder>
--session-mode=new|auto|existing
--display-mode=nodesktop|desktop
```

## Diagnostics

1. Run `node <skill-dir>\scripts\matlab-mcp-run.mjs probe` to verify MCP initialization and list tools without launching MATLAB.
2. Run `node <skill-dir>\scripts\matlab-mcp-run.mjs eval "disp(version)"` to verify MATLAB startup and result return.
3. Confirm `WINDIR` is present when MATLAB fails only under Codex.
4. Check `%TEMP%\matlab-mcp-control` for server logs.
5. Rerun outside a restricted sandbox when MATLAB reports `File system inconsistency` or cannot initialize preferences/licensing.
6. Check Docker only for unrelated MCP services. Docker Desktop's Linux engine cannot directly launch this host Windows MATLAB installation.
