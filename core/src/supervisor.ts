import { spawn, type ChildProcess } from "node:child_process";

// Garde un processus en vie (ffmpeg, gst-launch) : relance avec délai croissant s'il s'arrête, arrêt propre sur demande.

export type Supervised = { stop: () => void; running: () => boolean };

export function supervise(name: string, cmd: string, args: string[], log: (msg: string) => void, env?: NodeJS.ProcessEnv): Supervised {
  let child: ChildProcess | null = null;
  let stopped = false;
  let delay = 1000;
  let timer: NodeJS.Timeout | null = null;

  const start = () => {
    if (stopped) return;
    const startedAt = Date.now();
    child = spawn(cmd, args, { stdio: ["ignore", "ignore", "pipe"], env: { ...process.env, ...env } });
    let tail = "";
    child.stderr?.on("data", (d: Buffer) => {
      tail = (tail + d.toString()).slice(-600);
    });
    child.on("error", (e) => log(`${name} : ${e.message}`));
    child.on("exit", (code, signal) => {
      child = null;
      if (stopped) return;
      if (Date.now() - startedAt > 30_000) delay = 1000; // a tourné correctement : on repart vite
      log(`${name} arrêté (${signal ?? code}), relance dans ${delay / 1000} s. ${tail.trim().split("\n").pop() ?? ""}`);
      timer = setTimeout(start, delay);
      delay = Math.min(delay * 2, 30_000);
    });
  };
  start();

  return {
    stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
      if (child) {
        const c = child;
        c.kill("SIGINT");
        setTimeout(() => c.exitCode === null && c.kill("SIGKILL"), 3000).unref();
      }
    },
    running: () => child !== null,
  };
}
