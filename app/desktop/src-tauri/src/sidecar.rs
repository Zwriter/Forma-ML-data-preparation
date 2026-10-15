use serde_json::Value;
use std::{io::{BufRead, BufReader, Write}, process::{Child, ChildStdin, Command, Stdio}, sync::{Arc, Mutex, mpsc::{self, Sender, Receiver}}, thread, time::{Duration, Instant}};
use tauri::{AppHandle, Emitter};

#[derive(Default)]
pub struct Engine { writer: Mutex<Option<ChildStdin>>, child: Mutex<Option<Child>>, replies: Arc<Mutex<Option<Receiver<Value>>>>, request_lock: Mutex<()> }

impl Engine {
    pub fn start(&self, app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
        let engine_dir = std::env::var_os("FORMA_ENGINE_DIR")
            .map(std::path::PathBuf::from)
            .unwrap_or_else(|| std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../../engine"));
        let virtualenv_python = engine_dir.join(".venv").join(if cfg!(windows) {
            "Scripts/python.exe"
        } else {
            "bin/python"
        });
        let python = std::env::var_os("FORMA_PYTHON")
            .map(std::path::PathBuf::from)
            .unwrap_or_else(|| {
                if virtualenv_python.is_file() {
                    virtualenv_python
                } else {
                    "python".into()
                }
            });
        let mut command = Command::new(python);
        command.args(["-m", "forma_engine"]);
        command.current_dir(engine_dir);
        let mut child = command.stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::inherit()).spawn()?;
        let stdin = child.stdin.take().ok_or("sidecar stdin unavailable")?;
        let stdout = child.stdout.take().ok_or("sidecar stdout unavailable")?;
        let (tx, rx) = mpsc::channel::<Value>();
        *self.writer.lock().map_err(|_| "sidecar writer poisoned")? = Some(stdin);
        *self.replies.lock().map_err(|_| "sidecar receiver poisoned")? = Some(rx);
        *self.child.lock().map_err(|_| "sidecar process poisoned")? = Some(child);
        let handle = app.clone();
        thread::spawn(move || Self::relay(stdout, tx, handle));
        Ok(())
    }

    fn relay(stdout: impl std::io::Read + Send + 'static, tx: Sender<Value>, app: AppHandle) {
        for line in BufReader::new(stdout).lines().flatten() {
            if let Ok(value) = serde_json::from_str::<Value>(&line) {
                if value.get("event").is_some() { let _ = app.emit("engine-event", value); }
                else { let _ = tx.send(value); }
            }
        }
        let _ = app.emit("engine-crashed", "Engine sidecar stopped unexpectedly.");
    }

    pub fn request(&self, request: Value) -> Result<Value, String> {
        let _request_guard = self.request_lock.lock().map_err(|_| "request lock poisoned")?;
        let id = request.get("id").and_then(Value::as_str).ok_or("request id required")?.to_string();
        let mut guard = self.writer.lock().map_err(|_| "sidecar writer poisoned")?;
        let writer = guard.as_mut().ok_or("engine sidecar is not running")?;
        writeln!(writer, "{}", request).map_err(|err| format!("Could not write to engine: {err}"))?;
        writer.flush().map_err(|err| format!("Could not flush engine request: {err}"))?;
        drop(guard);
        let receiver_guard = self.replies.lock().map_err(|_| "sidecar receiver poisoned")?;
        let receiver = receiver_guard.as_ref().ok_or("engine sidecar is not running")?;
        loop {
            let response = receiver.recv_timeout(Duration::from_secs(120)).map_err(|error| match error {
                mpsc::RecvTimeoutError::Timeout => "engine request timed out",
                mpsc::RecvTimeoutError::Disconnected => "engine sidecar stopped",
            })?;
            if response.get("id").and_then(Value::as_str) == Some(&id) { return Ok(response); }
        }
    }

    pub fn shutdown(&self) {
        if let Ok(mut writer) = self.writer.lock() { writer.take(); }
        if let Ok(mut child) = self.child.lock() {
            if let Some(process) = child.as_mut() {
                let deadline = Instant::now() + Duration::from_secs(5);
                while Instant::now() < deadline {
                    if matches!(process.try_wait(), Ok(Some(_))) { break; }
                    thread::sleep(Duration::from_millis(50));
                }
                if matches!(process.try_wait(), Ok(None)) { let _ = process.kill(); }
                let _ = process.wait();
            }
            child.take();
        }
    }
}
