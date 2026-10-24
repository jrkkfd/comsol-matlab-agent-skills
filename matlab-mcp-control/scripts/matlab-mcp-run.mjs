import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import readline from "node:readline";

const DEFAULT_SERVER = "D:\\D Document\\Matlab 2\\tools\\matlab-mcp-server-windows-x64.exe";
const DEFAULT_MATLAB_ROOT = "D:\\APP\\matlab2025b here";
const VALID_ACTIONS = new Set(["probe", "eval", "run", "check", "test", "toolboxes"]);

function usage() {
  console.log(`Usage:
  node matlab-mcp-run.mjs probe
  node matlab-mcp-run.mjs eval "MATLAB code"
  node matlab-mcp-run.mjs run <script.m>
  node matlab-mcp-run.mjs check <script.m>
  node matlab-mcp-run.mjs test <test-file.m>
  node matlab-mcp-run.mjs toolboxes

Options:
  --server=<path> --matlab-root=<path> --project=<path>
  --session-mode=new|auto|existing --display-mode=nodesktop|desktop`);
}

const rawArgs = process.argv.slice(2);
const action = rawArgs[0];
if (!VALID_ACTIONS.has(action)) {
  usage();
  process.exit(action === "help" || action === "--help" ? 0 : 2);
}

const options = {};
const positional = [];
for (const arg of rawArgs.slice(1)) {
  const match = arg.match(/^--([a-z-]+)=(.*)$/s);
  if (match) options[match[1]] = match[2];
  else positional.push(arg);
}

const projectPath = resolve(options.project ?? process.cwd());
const serverPath = options.server ?? process.env.MATLAB_MCP_SERVER ?? DEFAULT_SERVER;
const matlabRoot = options["matlab-root"] ?? process.env.MATLAB_ROOT ?? DEFAULT_MATLAB_ROOT;
const sessionMode = options["session-mode"] ?? "new";
const displayMode = options["display-mode"] ?? "nodesktop";
const logFolder = resolve(tmpdir(), "matlab-mcp-control");
mkdirSync(logFolder, { recursive: true });

if (!existsSync(serverPath)) throw new Error(`MATLAB MCP Server not found: ${serverPath}`);
if (!existsSync(matlabRoot)) throw new Error(`MATLAB root not found: ${matlabRoot}`);

const server = spawn(serverPath, [
  `--matlab-root=${matlabRoot}`,
  `--initial-working-folder=${projectPath}`,
  `--matlab-display-mode=${displayMode}`,
  `--matlab-session-mode=${sessionMode}`,
  "--disable-telemetry=true",
  `--log-folder=${logFolder}`,
  "--log-level=info",
], {
  cwd: projectPath,
  env: { ...process.env, WINDIR: process.env.WINDIR ?? "C:\\Windows" },
  stdio: ["pipe", "pipe", "pipe"],
});

const pending = new Map();
let nextId = 1;

readline.createInterface({ input: server.stdout }).on("line", (line) => {
  if (!line.trim().startsWith("{")) return;
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    return;
  }
  if (message.id !== undefined && pending.has(message.id)) {
    const { resolve: finish, reject, timer } = pending.get(message.id);
    clearTimeout(timer);
    pending.delete(message.id);
    message.error ? reject(new Error(JSON.stringify(message.error))) : finish(message.result);
  }
});

server.stderr.on("data", (chunk) => process.stderr.write(chunk));
server.on("error", rejectPending);
server.on("exit", (code) => {
  if (pending.size > 0) rejectPending(new Error(`MATLAB MCP Server exited with code ${code}`));
});

function rejectPending(error) {
  for (const { reject, timer } of pending.values()) {
    clearTimeout(timer);
    reject(error);
  }
  pending.clear();
}

function send(message) {
  server.stdin.write(`${JSON.stringify(message)}\n`);
}

function request(method, params, timeoutMs = 600_000) {
  const id = nextId++;
  return new Promise((finish, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Timed out waiting for ${method}`));
    }, timeoutMs);
    pending.set(id, { resolve: finish, reject, timer });
    send({ jsonrpc: "2.0", id, method, params });
  });
}

function requireArgument(label) {
  if (positional.length === 0) throw new Error(`${action} requires ${label}`);
  return positional.join(" ");
}

function emitContent(result) {
  let imageIndex = 0;
  for (const item of result.content ?? []) {
    if (item.type === "text") {
      console.log(item.text);
    } else if (item.type === "image" && item.data) {
      imageIndex += 1;
      const extension = item.mimeType === "image/jpeg" ? ".jpg" : ".png";
      const outputPath = resolve(projectPath, `${action}-mcp-result-${imageIndex}${extension}`);
      writeFileSync(outputPath, Buffer.from(item.data, "base64"));
      console.log(`Saved MCP image: ${outputPath}`);
    } else {
      console.log(JSON.stringify(item));
    }
  }
}

try {
  const initialized = await request("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "matlab-mcp-control-skill", version: "1.0.0" },
  });
  send({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });

  const listed = await request("tools/list", {});
  if (action === "probe") {
    console.log(`Server: ${initialized.serverInfo?.version ?? initialized.serverInfo?.name}`);
    console.log(`Tools: ${listed.tools.map(({ name }) => name).join(", ")}`);
  } else {
    const toolCall = action === "eval"
      ? { name: "evaluate_matlab_code", arguments: { code: requireArgument("MATLAB code"), project_path: projectPath } }
      : action === "run"
        ? { name: "run_matlab_file", arguments: { script_path: resolve(projectPath, requireArgument("a .m file")) } }
        : action === "check"
          ? { name: "check_matlab_code", arguments: { script_path: resolve(projectPath, requireArgument("a .m file")) } }
          : action === "test"
            ? { name: "run_matlab_test_file", arguments: { script_path: resolve(projectPath, requireArgument("a MATLAB test file")) } }
            : { name: "detect_matlab_toolboxes", arguments: {} };

    if (!listed.tools.some(({ name }) => name === toolCall.name)) {
      throw new Error(`MCP tool is unavailable: ${toolCall.name}`);
    }
    emitContent(await request("tools/call", toolCall));
  }
} finally {
  server.stdin.end();
  server.kill();
}
