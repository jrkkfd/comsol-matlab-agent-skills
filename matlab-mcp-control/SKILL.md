---
name: matlab-mcp-control
description: Control, execute, analyze, and verify local MATLAB work through the official MathWorks MATLAB MCP Server on this Windows machine. Use when Codex needs to run MATLAB code or .m files, inspect installed toolboxes, run MATLAB tests, check MATLAB code, generate MATLAB figures/data, diagnose the MATLAB MCP connection, or automate MATLAB R2025b without manually using the desktop UI.
---

# MATLAB MCP Control

Use the official MATLAB MCP Server over stdio. Prefer MCP tools already exposed in the current task; use the bundled client only when the task has not loaded those tools.

## Workflow

1. Check whether `evaluate_matlab_code`, `run_matlab_file`, `run_matlab_test_file`, `check_matlab_code`, or `detect_matlab_toolboxes` is callable.
2. Use the matching MCP tool directly when available.
3. Otherwise use `scripts/matlab-mcp-run.mjs` from this skill:

```powershell
node <skill-dir>\scripts\matlab-mcp-run.mjs probe
node <skill-dir>\scripts\matlab-mcp-run.mjs eval "fprintf('VERSION=%s\n', version)"
node <skill-dir>\scripts\matlab-mcp-run.mjs run "C:\absolute\path\job.m"
node <skill-dir>\scripts\matlab-mcp-run.mjs check "C:\absolute\path\job.m"
node <skill-dir>\scripts\matlab-mcp-run.mjs toolboxes
```

4. For nontrivial tasks, write a reproducible `.m` file in the user's workspace and run it with `run_matlab_file` or the `run` command. Do not bury substantial MATLAB logic in a shell command.
5. Make MATLAB scripts save requested figures and data to explicit workspace paths using `exportgraphics`, `writetable`, `save`, or the appropriate structured writer.
6. Inspect console output and every generated artifact. View generated PNG/JPEG files when visual correctness matters.
7. Report parameters, key numeric results, artifact paths, and validation performed.

## Execution Rules

- Default to a fresh `nodesktop` MATLAB session. This avoids modifying or interfering with an open desktop session.
- Pass absolute paths to MCP tools. Resolve relative user paths before calling MATLAB.
- Keep MATLAB output files inside the active workspace unless the user requests another location.
- Set reasonable numerical resolution and expose physical/model assumptions in the script.
- Treat MATLAB startup as potentially slow. Allow up to 10 minutes for a cold start.
- If startup fails with a filesystem or preference-directory error in a restricted sandbox, rerun the same narrowly scoped command with sandbox escalation. MATLAB writes licensing and user preference files outside the workspace.
- Do not run `--setup-matlab` or switch to `existing` session mode unless the user asks to reuse an open MATLAB. That command installs a MATLAB add-on.
- Do not route this Windows-host MATLAB through a Linux Docker container. The native MCP executable must reach the licensed Windows installation.

## Local Configuration

Read [references/local-setup.md](references/local-setup.md) when configuring, diagnosing, updating, or locating the MATLAB/MCP installation. It contains the verified paths, Codex TOML entry, environment overrides, and failure checks.
