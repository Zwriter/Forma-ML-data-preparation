#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod sidecar;
mod commands;
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(sidecar::Engine::default())
        .invoke_handler(tauri::generate_handler![commands::engine_request])
        .setup(|app| {
            let engine = app.state::<sidecar::Engine>();
            engine.start(app.handle())?;
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("failed to build Forma")
        .run(|app, event| {
            if let tauri::RunEvent::Exit = event {
                if let Some(engine) = app.try_state::<sidecar::Engine>() { engine.shutdown(); }
            }
        });
}
