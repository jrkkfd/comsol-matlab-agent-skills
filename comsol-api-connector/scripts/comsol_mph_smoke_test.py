from __future__ import annotations

import argparse
import os
from pathlib import Path

import mph


DEFAULT_COMSOL_BIN = Path(r"D:\Program Files\COMSOL\COMSOL64\Multiphysics\bin\win64")


def configure(comsol_bin: Path) -> None:
    home = Path(r"C:\tmp\comsol-home")
    home.mkdir(parents=True, exist_ok=True)
    os.environ["USERPROFILE"] = str(home)
    os.environ["HOMEDRIVE"] = "C:"
    os.environ["HOMEPATH"] = r"\tmp\comsol-home"
    os.environ["PYTHONIOENCODING"] = "utf-8"
    os.environ["PATH"] = str(comsol_bin) + ";" + os.environ.get("PATH", "")


def main() -> int:
    parser = argparse.ArgumentParser(description="Smoke test Python mph connectivity to local COMSOL.")
    parser.add_argument("--comsol-bin", default=str(DEFAULT_COMSOL_BIN), help="Path to COMSOL Multiphysics bin\\win64")
    parser.add_argument("--cores", type=int, default=1)
    parser.add_argument("--out", default="comsol_mph_smoke_test.mph")
    args = parser.parse_args()

    comsol_bin = Path(args.comsol_bin)
    if not comsol_bin.exists():
        raise SystemExit(f"COMSOL bin path not found: {comsol_bin}")

    configure(comsol_bin)
    client = mph.Client(cores=args.cores)
    try:
        model = client.create("codex_comsol_smoke_test")
        j = model.java
        j.component().create("comp1", True)
        comp = j.component("comp1")
        comp.geom().create("geom1", 2)
        geom = comp.geom("geom1")
        geom.create("r1", "Rectangle")
        geom.feature("r1").set("size", ["1", "1"])
        geom.run()
        comp.mesh().create("mesh1")
        comp.mesh("mesh1").run()
        out = Path(args.out).resolve()
        model.save(out)
        print(f"OK: COMSOL mph API works; wrote {out}")
    finally:
        try:
            client.clear()
        except Exception:
            pass
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
