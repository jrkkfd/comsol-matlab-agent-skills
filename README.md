# comsol-matlab-agent-skills

> 两个面向 AI 编码代理（Codex / Claude Code / DeepSeek Harness 等）的 Windows 工程自动化 **skill**：让代理直接驱动本机的 **COMSOL Multiphysics** 与 **MATLAB**，而不是靠你手动点界面。

Skill 就是一组纯文本说明（`SKILL.md`）+ 少量可执行脚本。代理在遇到 COMSOL 仿真、MATLAB 跑代码这类任务时会自动加载它，从而知道该走哪条 API、该改哪些环境变量、常见报错怎么排。

---

## ✨ 包含的两个 skill

| Skill | 能做什么 | 运行依赖 |
| --- | --- | --- |
| [`comsol-api-connector`](comsol-api-connector/SKILL.md) | 通过 Python `mph` API 连接本机 COMSOL：检查 / 新建 / 修改 `.mph` 模型、改参数、参数扫描、求解、导出 CSV / PNG / MPH，并排查 COMSOL Java API、周期边界 mesh、特征频率选模等常见问题 | COMSOL Multiphysics、Python 3、`pip install mph` |
| [`matlab-mcp-control`](matlab-mcp-control/SKILL.md) | 通过官方 MathWorks **MATLAB MCP Server**（stdio）执行 MATLAB：跑代码 / `.m` 文件 / 测试文件、静态检查、列已安装 toolbox、出图并回传，含连接诊断 | MATLAB（R2025b 验证）、[matlab-mcp-server](https://github.com/matlab/matlab-mcp-server)、Node.js 18+ |

两者都是「在本机装好商业软件之后，把 AI 代理接进这套软件」的实践记录：路径、环境变量、踩过的坑都写进了 skill 里，代理不需要每次重新摸索。

---

## 📁 目录结构

```text
.
├── comsol-api-connector/
│   ├── SKILL.md                      # 主说明：工作流、Python 模板、报错排查
│   ├── agents/openai.yaml            # 代理界面元数据（显示名 / 简介 / 默认提示）
│   ├── references/comsol-mph-notes.md# 补充笔记：常用 Java API 片段、周期边界说明
│   └── scripts/comsol_mph_smoke_test.py # 连通性冒烟测试（建一个 2D 模型并保存）
└── matlab-mcp-control/
    ├── SKILL.md
    ├── agents/openai.yaml
    ├── references/local-setup.md     # MCP 可执行文件、Codex TOML 配置、诊断步骤
    └── scripts/matlab-mcp-run.mjs    # 轻量 MCP stdio 客户端：probe/eval/run/check/test/toolboxes
```

---

## 🚀 安装

把 skill 目录整体复制到你的代理的 skills 搜索目录即可（保持 `SKILL.md` 在目录根）：

```powershell
# Codex
Copy-Item -Recurse .\comsol-api-connector, .\matlab-mcp-control -Destination "$env:USERPROFILE\.codex\skills\"

# Claude Code（示例）
# ~/.claude/skills/

# DeepSeek Harness / 其他代理：放到其 skills 目录即可
```

安装后重启代理会话。之后只要你说「帮我跑一下这个 COMSOL 模型」「用 MATLAB 画个图」，代理就会加载对应 skill。

---

## ⚙️ 前置条件

### COMSOL

- 本机已安装 COMSOL Multiphysics（skill 中记录的是 `bin\win64` 路径示例）。
- Python 环境里安装 `mph`：

```powershell
pip install mph
```

- 运行冒烟测试（会建一个矩形模型并保存 `.mph`，确认 API 通路正常）：

```powershell
python comsol-api-connector\scripts\comsol_mph_smoke_test.py
# 期望输出：OK: COMSOL mph API works; wrote ...\comsol_mph_smoke_test.mph
```

> 关键点：先把 COMSOL 的 `bin\win64` 前置到 `PATH`，并把 `USERPROFILE` 指向一个可写临时目录。很多「COMSOL 启动失败 / 锁文件」问题都出在这里，`SKILL.md` 里有完整模板。

### MATLAB

1. 下载官方 [matlab-mcp-server](https://github.com/matlab/matlab-mcp-server) 的 Windows 版可执行文件。
2. 在代理的 MCP 配置里登记（以 Codex 的 `config.toml` 为例）：

```toml
[mcp_servers.matlab]
command = 'C:\path\to\matlab-mcp-server-windows-x64.exe'
args = ['--matlab-root=C:\Program Files\MATLAB\R2025b', '--initial-working-folder=D:\work', '--matlab-display-mode=nodesktop', '--matlab-session-mode=new', '--disable-telemetry=true']

[mcp_servers.matlab.env]
WINDIR = 'C:\Windows'
```

3. 没有 MCP 工具时可用自带客户端直接验证：

```powershell
node matlab-mcp-control\scripts\matlab-mcp-run.mjs probe
node matlab-mcp-control\scripts\matlab-mcp-run.mjs eval "disp(version)"
```

> 关键点：Windows 上必须把 `WINDIR` 传给 MATLAB；受限沙箱里 MATLAB 写偏好 / license 文件可能失败，需要放行对应目录。更多细节见 [`references/local-setup.md`](matlab-mcp-control/references/local-setup.md)。

---

## 💡 设计思路（为什么值得看）

- **先验证，再干活**：两个 skill 都要求先跑冒烟测试 / `probe`，把「环境没通」和「模型本身有问题」区分开。
- **可复现**：长任务先小网格 smoke，再跑全量；输出写进新目录，绝不覆盖原始模型。
- **把踩坑写进文档**：COMSOL 的周期边界 mesh 报错、Γ 点高 Q 是 BIC 还是腔模、MATLAB 冷启动慢 / 沙箱写文件失败——都直接在 `SKILL.md` 里给出判断和处置方式。
- **代理无关**：本质就是 Markdown + 脚本，Codex、Claude Code、DSH 都能用，只需放到各自的 skills 目录。

---

## 📄 License

[MIT](LICENSE)

> 说明：文中出现的绝对路径、MCP 可执行文件哈希等来自作者本机环境，属于示例，请按自己的安装位置修改。仓库不包含任何商业软件、模型文件或数据。
