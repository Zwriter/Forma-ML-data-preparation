# Local development

Forma has a Python engine under `app/engine` and a React/Tauri desktop client under
`app/frontend/desktop`. Python owns all dataset access; the browser layer receives bounded
previews and schema metadata only.

## Engine

Use Python 3.11 or newer:

```powershell
Set-Location app/engine
py -m venv .venv
.\.venv\Scripts\Activate.ps1
py -m pip install -e ".[dev]"
py -m forma_engine
```

The engine reads one newline-delimited JSON request per stdin line. It writes correlated
responses and job events to stdout; structured diagnostics use stderr. The Tauri development
shell starts the same module from `app/engine`. Set `FORMA_PYTHON` or `FORMA_ENGINE_DIR` when
your local Python environment or checkout layout differs.

## Desktop

Before launching on Windows, install Rust with `rustup` and select the MSVC toolchain. Install
Microsoft C++ Build Tools with **Desktop development with C++** selected. Windows 10 and newer
usually include the WebView2 runtime. See the [Tauri 2 prerequisites](https://v2.tauri.app/start/prerequisites/)
for current installation steps. Restart PowerShell after installing Rust, then verify Cargo is
available:

```powershell
cargo --version
rustc --version
```

Install Python 3.11 or newer and the Forma engine package as described above. Then launch:

```powershell
Set-Location app/frontend/desktop
npm install
npm run tauri dev
```

`npm run dev` starts only the frontend; it has no native file picker or local engine bridge and
cannot open datasets in a browser.

The MVP selects files by entering a local path. The engine validates file access and schema and
does not write to imported source files. Preview requests have a maximum of 500 records.
