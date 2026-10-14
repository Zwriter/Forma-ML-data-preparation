# Local development

Forma has a Python engine under `app/engine` and a React/Tauri desktop client under
`app/frontend/desktop`. Python owns all dataset access; the browser layer receives bounded
previews and schema metadata only.

## Engine

Use Python 3.11 or newer:

```powershell
Set-Location app/engine
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
python -m forma_engine
```

The engine reads one newline-delimited JSON request per stdin line. It writes correlated
responses and job events to stdout; structured diagnostics use stderr. The Tauri development
shell starts the same module from `app/engine`. Set `FORMA_PYTHON` or `FORMA_ENGINE_DIR` when
your local Python environment or checkout layout differs.

## Desktop

```powershell
Set-Location app/frontend/desktop
npm install
npm run dev
```

For the native shell, install the Tauri 2 prerequisites and run `npm run tauri dev`. The Python
package must be installed in the selected Python environment before launching the desktop app.

The MVP selects files by entering a local path. The engine validates file access and schema and
does not write to imported source files. Preview requests have a maximum of 500 records.
