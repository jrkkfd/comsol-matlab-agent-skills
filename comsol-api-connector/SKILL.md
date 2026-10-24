---
name: comsol-api-connector
description: Connect Codex to a local COMSOL Multiphysics installation through the Python mph API for model inspection, scripted model creation, parameter sweeps, solving, exporting CSV/PNG/MPH files, and troubleshooting COMSOL API runs. Use when the user asks Codex to run COMSOL, inspect or modify .mph files, automate COMSOL simulations, reproduce paper figures with COMSOL, or diagnose COMSOL Java/API/mesh/solver errors.
---

# COMSOL API Connector

## Core Rule

Prefer the Python `mph` API unless the user explicitly has a COMSOL MCP server already configured. In this environment, direct `mph` automation has been the reliable path; do not spend time searching for a non-existent MCP bridge before trying `mph`.

The known COMSOL bin path for this user is:

```text
D:\Program Files\COMSOL\COMSOL64\Multiphysics\bin\win64
```

If a future user or machine differs, first ask for the COMSOL location. If the user does not know, inspect likely paths before giving up.

## Fast Workflow

1. Locate COMSOL.
   - Ask the user for the COMSOL `bin\win64` directory if not already known.
   - On this machine, use the known path above.
   - Verify it contains COMSOL executables or DLLs with `Get-ChildItem`.

2. Configure the process environment before importing/starting COMSOL.
   - Prepend COMSOL `bin\win64` to `PATH`.
   - Set a writable temporary home to avoid profile/lock issues:

```powershell
$env:USERPROFILE='C:\tmp\comsol-home'
$env:HOMEDRIVE='C:'
$env:HOMEPATH='\tmp\comsol-home'
$env:PYTHONIOENCODING='utf-8'
$env:PATH='D:\Program Files\COMSOL\COMSOL64\Multiphysics\bin\win64;' + $env:PATH
```

3. Run the bundled smoke test before doing real work:

```powershell
python comsol-api-connector\scripts\comsol_mph_smoke_test.py
```

Expected result: it starts `mph.Client`, creates a small 2D model, saves `comsol_mph_smoke_test.mph`, and prints `OK`.

4. Only after the smoke test passes, load/create the actual `.mph` model and run the requested solve/export.

5. For long sweeps, start with a tiny smoke grid first, then run the full grid.
   - Example: `3x3` or a few k-points before `21x21`.
   - Keep outputs in a new directory for each major numerical change so previous results are not overwritten.

## Python Pattern

Use this pattern at the top of COMSOL scripts:

```python
from pathlib import Path
import os
import mph

COMSOL_BIN = Path(r"D:\Program Files\COMSOL\COMSOL64\Multiphysics\bin\win64")

def configure_comsol() -> None:
    home = Path(r"C:\tmp\comsol-home")
    home.mkdir(parents=True, exist_ok=True)
    os.environ["USERPROFILE"] = str(home)
    os.environ["HOMEDRIVE"] = "C:"
    os.environ["HOMEPATH"] = r"\tmp\comsol-home"
    os.environ["PYTHONIOENCODING"] = "utf-8"
    os.environ["PATH"] = str(COMSOL_BIN) + ";" + os.environ.get("PATH", "")

configure_comsol()
client = mph.Client(cores=4)
try:
    model = client.load(r"D:\path\to\model.mph")
    # inspect, set parameters, solve, evaluate, save
finally:
    try:
        client.clear()
    except Exception:
        pass
```

## Inspecting an MPH

Use `model.java` for COMSOL Java API access. Useful probes:

```python
j = model.java
print(list(j.param().varnames()))
print(list(j.component().tags()))
print(list(j.study().tags()))
print(list(j.sol().tags()))

comp = j.component("comp1")
print(list(comp.geom("geom1").feature().tags()))
print(list(comp.physics("ewfd").feature().tags()))
print(list(comp.mesh("mesh1").feature().tags()))
```

For feature properties:

```python
feat = comp.physics("ewfd").feature("pcx")
print(list(feat.properties()))
for name in ["PeriodicType", "kFloquet", "meshSimilarity"]:
    try:
        print(name, feat.getString(name))
    except Exception:
        pass
```

## Solving and Exporting

Typical solve loop:

```python
model.parameter("kxnorm", "0.05")
model.parameter("kynorm", "0.02")
model.solve()
freqs = [float(x) for x in model.evaluate("ewfd.freq")]
qs = [float(x) for x in model.evaluate("ewfd.Qfactor")]
model.save(r"D:\path\to\solved.mph")
```

Write CSV incrementally during long sweeps so partial results survive interruption. Print progress with timestamps.

## Common Failure Modes

### COMSOL cannot start

Check:
- COMSOL bin path is prepended to `PATH`.
- `mph` is importable in the active Python.
- `USERPROFILE` points to a writable temporary directory.
- No stale Java/COMSOL process is holding a lock.

### CopyFace / CopyEdge mesh errors

Symptoms:
- `Different number of elements on edges`
- `` ``
- `` ``

Actions:
- Build periodic source and destination meshes in a deliberate order.
- For 3D double-periodic models, do not mesh both source faces in one `FreeTri` if shared edges become inconsistent. Mesh one periodic source, copy it, then mesh/copy the other direction.
- If strict compatible mapping fails during solve, inspect the periodic condition property `meshSimilarity`. Valid values seen locally: `def`, `auto`, `off`, `fail`. Setting `off` can allow nonmatching periodic mapping, but note it changes the numerical treatment.

### Eigenfrequency finds box/FP/PML modes

Long air/PML regions can introduce many Fabry-Perot-like or box modes. Do not blindly pick the highest Q mode. Filter or track modes using:
- field energy localized in the slab/bar region,
- `Ez_fraction` or polarization fraction,
- overlap with the previous k-point field,
- expected frequency window,
- sensitivity to air/PML thickness.

### Gamma-point high Q

High Q at Gamma can be a symmetry-protected BIC or a box mode. It is not automatically the accidental BIC in a paper figure. Check field localization and mode symmetry before interpreting it.

## Long-Run Discipline

- Never overwrite the user's original `.mph`; save fixed or derived models with a new filename/directory.
- For runs that may last hours, report the output directory and process progress.
- If the user asks to run overnight or check later, create a heartbeat automation for result inspection.
- Before finalizing, verify generated PNGs visually and report concrete file paths.

## Bundled Resources

- `scripts/comsol_mph_smoke_test.py`: quick API connectivity test.
- `references/comsol-mph-notes.md`: extra notes and command snippets.
