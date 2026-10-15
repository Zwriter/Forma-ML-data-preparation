use serde_json::Value;
use tauri::State;
use crate::sidecar::Engine;

#[tauri::command]
pub fn engine_request(engine: State<'_, Engine>, request: Value) -> Result<Value, String> {
    engine.request(request)
}
