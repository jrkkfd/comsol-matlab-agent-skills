# COMSOL MPH Notes

## Known Local COMSOL

```text
D:\Program Files\COMSOL\COMSOL64\Multiphysics\bin\win64
```

## Reliable PowerShell Prefix

```powershell
$env:USERPROFILE='C:\tmp\comsol-home'
$env:HOMEDRIVE='C:'
$env:HOMEPATH='\tmp\comsol-home'
$env:PYTHONIOENCODING='utf-8'
$env:PATH='D:\Program Files\COMSOL\COMSOL64\Multiphysics\bin\win64;' + $env:PATH
python your_comsol_script.py
```

## Useful COMSOL Java API Patterns

Create model:

```python
client = mph.Client(cores=4)
model = client.create("name")
j = model.java
```

Load model:

```python
model = client.load(r"D:\path\file.mph")
```

Set parameters and solve:

```python
model.parameter("kxnorm", "0.05")
model.solve()
```

Evaluate:

```python
freqs = model.evaluate("ewfd.freq")
qs = model.evaluate("ewfd.Qfactor")
```

Save:

```python
model.save(r"D:\path\file_solved.mph")
```

## Periodic Boundary Notes

For COMSOL periodic conditions, inspect:

```python
feat = j.component("comp1").physics("ewfd").feature("pcx")
print(list(feat.properties()))
print(feat.getString("meshSimilarity"))
```

Observed `meshSimilarity` allowed values: `def`, `auto`, `off`, `fail`.

Use `fail` when strict mesh compatibility is required. Use `off` only after noting that nonmatching periodic mapping is acceptable for the current exploratory run.
