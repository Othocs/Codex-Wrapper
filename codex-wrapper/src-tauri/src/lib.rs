use std::sync::{Arc, Mutex};
use std::process::{Child, Stdio};
use tauri::{Emitter, State};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct CodexStatus {
    installed: bool,
    version: Option<String>,
    error: Option<String>,
}

pub struct AppState {
    active_process: Arc<Mutex<Option<Child>>>,
}

#[tauri::command]
async fn open_folder(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    let folder = app.dialog()
        .file()
        .blocking_pick_folder();

    match folder {
        Some(path) => Ok(Some(path.to_string())),
        None => Ok(None),
    }
}

#[tauri::command]
async fn check_codex_installed() -> Result<CodexStatus, String> {
    use std::process::Command;

    match Command::new("codex")
        .arg("--version")
        .output() {
        Ok(output) => {
            if output.status.success() {
                let version = String::from_utf8_lossy(&output.stdout).to_string();
                Ok(CodexStatus {
                    installed: true,
                    version: Some(version.trim().to_string()),
                    error: None,
                })
            } else {
                Ok(CodexStatus {
                    installed: false,
                    version: None,
                    error: Some("Codex command failed".to_string()),
                })
            }
        },
        Err(e) => {
            Ok(CodexStatus {
                installed: false,
                version: None,
                error: Some(format!("Codex not found: {}", e)),
            })
        }
    }
}

#[tauri::command]
async fn send_message(
    message: String,
    project_path: String,
    context: Vec<String>,
    state: State<'_, AppState>,
    window: tauri::Window,
) -> Result<(), String> {
    use std::process::Command;
    use std::io::{BufRead, BufReader};

    println!("[Rust] send_message called");
    println!("[Rust] Message: {}", message);
    println!("[Rust] Project path: {}", project_path);
    println!("[Rust] Context lines: {}", context.len());

    // Build the full prompt with context
    let mut full_prompt = String::new();
    if !context.is_empty() {
        full_prompt.push_str("Previous context:\n");
        for ctx in context {
            full_prompt.push_str(&ctx);
            full_prompt.push('\n');
        }
        full_prompt.push_str("\n");
    }
    full_prompt.push_str(&message);

    println!("[Rust] Full prompt length: {} chars", full_prompt.len());

    // Spawn codex process using exec (non-interactive mode)
    println!("[Rust] Spawning codex exec process...");
    let mut child = Command::new("codex")
        .arg("exec")                      // Use exec subcommand for non-interactive mode
        .arg("--sandbox")
        .arg("workspace-write")           // Allow file modifications within workspace
        .arg("--skip-git-repo-check")     // Allow non-git folders
        .arg("-C")
        .arg(&project_path)               // Set working directory
        .arg(&full_prompt)                // The actual message/prompt
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| {
            println!("[Rust] ERROR: Failed to spawn codex: {}", e);
            format!("Failed to spawn codex: {}", e)
        })?;

    println!("[Rust] Codex process spawned successfully (PID: {})", child.id());

    // Extract stdout and stderr BEFORE storing in mutex
    let stdout = child.stdout.take();
    let stderr = child.stderr.take();
    println!("[Rust] Extracted stdout and stderr handles");

    // Now store the process in the mutex
    {
        let mut active = state.active_process.lock().unwrap();
        *active = Some(child);
        println!("[Rust] Process stored in state");
    }

    // Spawn thread to read stdout
    if let Some(stdout) = stdout {
        println!("[Rust] Starting stdout reader thread");
        let reader = BufReader::new(stdout);
        let window_clone = window.clone();

        std::thread::spawn(move || {
            println!("[Rust-Thread] stdout reader started");
            let mut line_count = 0;
            for line in reader.lines() {
                match line {
                    Ok(line) => {
                        line_count += 1;
                        println!("[Rust-Thread] stdout line {}: {}", line_count, line);
                        if let Err(e) = window_clone.emit("codex-output", &line) {
                            println!("[Rust-Thread] ERROR emitting codex-output: {}", e);
                        }
                    },
                    Err(e) => {
                        println!("[Rust-Thread] ERROR reading line: {}", e);
                        break;
                    }
                }
            }
            println!("[Rust-Thread] stdout reader finished ({} lines)", line_count);
            if let Err(e) = window_clone.emit("codex-complete", ()) {
                println!("[Rust-Thread] ERROR emitting codex-complete: {}", e);
            } else {
                println!("[Rust-Thread] Emitted codex-complete event");
            }
        });
    } else {
        println!("[Rust] WARNING: No stdout handle available");
    }

    // Spawn thread to read stderr
    if let Some(stderr) = stderr {
        println!("[Rust] Starting stderr reader thread");
        let reader = BufReader::new(stderr);
        let window_clone = window.clone();

        std::thread::spawn(move || {
            println!("[Rust-Thread] stderr reader started");
            for line in reader.lines() {
                match line {
                    Ok(line) => {
                        println!("[Rust-Thread] stderr: {}", line);
                        if let Err(e) = window_clone.emit("codex-error", &line) {
                            println!("[Rust-Thread] ERROR emitting codex-error: {}", e);
                        }
                    },
                    Err(e) => {
                        println!("[Rust-Thread] ERROR reading stderr: {}", e);
                        break;
                    }
                }
            }
            println!("[Rust-Thread] stderr reader finished");
        });
    } else {
        println!("[Rust] WARNING: No stderr handle available");
    }

    println!("[Rust] send_message completed, threads running");
    Ok(())
}

#[tauri::command]
async fn stop_generation(state: State<'_, AppState>) -> Result<(), String> {
    println!("[Rust] stop_generation called");
    let mut active = state.active_process.lock().unwrap();
    if let Some(mut child) = active.take() {
        println!("[Rust] Killing process (PID: {})", child.id());
        child.kill().map_err(|e| {
            println!("[Rust] ERROR: Failed to kill process: {}", e);
            format!("Failed to kill process: {}", e)
        })?;
        println!("[Rust] Process killed successfully");
        Ok(())
    } else {
        println!("[Rust] WARNING: No active process to stop");
        Err("No active process to stop".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let state = AppState {
        active_process: Arc::new(Mutex::new(None)),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            open_folder,
            check_codex_installed,
            send_message,
            stop_generation
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
