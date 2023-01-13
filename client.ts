/** 定義原始碼目錄 */
const SrcPath = "/Users/shiweiting/side_projects/snmsqr";

/** 定義目前執行階段 */
let phase = "empty_dir";
/**
 * 檢查目前的 path 並轉到正確的工作目錄
 */
const go2GitDirectory: () => void = () => {
  Deno.chdir("/Users/shiweiting/side_projects/snmsqr");
  const cwd = Deno.cwd();
  console.log(`Change current path to %c${cwd}`, "color:blue");

  // make sure current path is the same git directory
  if (cwd.trim() !== "/Users/shiweiting/side_projects/snmsqr".trim()) {
    console.log("wrong path::", cwd);
    Deno.exit();
  }
};

/**
 * 執行 Rsync 上傳
 * 不可使用 * 萬用字元，隱藏檔案會略過
 */
const executeRsync: () => Promise<number> = async () => {
  const p = Deno.run({
    cmd: [
      "rsync",
      "-avh",
      "./",
      "root@192.168.91.61:/home/www/",
    ],
    cwd: SrcPath,
    stdout: "piped",
    stderr: "piped",
    stdin: "piped",
  });

  const output = await p.output();
  console.log(new TextDecoder().decode(output));
  const status = await p.status();
  console.log(status);
  if (status.code != 0 && !status.success) {
    p.close();
    return 1;
  }
  p.close();
  return 0;
};

async function handleMessage(ws: WebSocket, data: string): Promise<void> {
  await Deno.stdout.write(
    new TextEncoder().encode(`SERVER >> ` + data + `\n`),
  );
  // Deno.stdout.write(new TextEncoder().encode(`\x1b[K`));
  if (data === "exit") {
    console.log("deploy done!");
    ws.send("connection_close");
    ws.close();
    Deno.exit();
  }
  if (data == "empty_dir_done") {
    go2GitDirectory();
    if (await executeRsync() != 0) {
      ws.close();
      Deno.exit(1);
    }
    /** starting install laravel */
    phase = "composer_update";
    ws.send("composer_update");
  }

  if (data == "composer_update_done") {
    console.log("composer_update_done...");
    console.log("preparing for execute artisan command...");
    // starting set laravel
    phase = "php_artisan";
    ws.send("php_artisan");
  }
  if (data == "php_artisan_done") {
    console.log("artisan command process done...");
    ws.close();
  }
}

function logError(msg: string) {
  console.log(msg);
  Deno.exit(1);
}

function _handleError(e: Event | ErrorEvent) {
  console.log(e instanceof ErrorEvent ? e.message : e.type);
}

/**
 * get git current branch name
 */
async function getCurrentGitBranchName(): Promise<string> {
  const p = Deno.run({
    cmd: [
      "git",
      "rev-parse",
      "--abbrev-ref",
      "HEAD",
    ],
    cwd: SrcPath,
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  });
  await p.status();
  const output = new TextDecoder().decode(await p.output());
  p.close();
  return output;
}

/** 切換檢查是否在 main 分之 */
async function switchToMainBranch(): Promise<string> {
  const p = Deno.run({
    cmd: [
      "git",
      "switch",
      "main",
    ],
    cwd: SrcPath,
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  });
  await p.status();
  await p.output();
  p.close();
  /** 檢查是否為 main 分支 */
  return await getCurrentGitBranchName();
}

/** 更新 main 到最新 */
async function gitPullFromMain() {
  const p = Deno.run({
    cmd: [
      "git",
      "pull",
    ],
    cwd: SrcPath,
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  });
  await p.status();
  const output = await p.output();
  console.log(new TextDecoder().decode(output));
  p.close();
}

/**
 * Main program
 * 發送 action `empty_dir` 觸發遠端開始
 */
async function corefunction() {
  try {
    const result = await switchToMainBranch();
    if (result.trim() != "main") {
      Deno.stdout.write(
        new TextEncoder().encode(`[Incorrect git branch]: ${result}`),
      );
      Deno.exit();
    }

    await gitPullFromMain();

    const ws = new WebSocket("ws://192.168.91.61:8080");
    ws.onopen = () => {
      console.log("Connected to server ...");
      ws.send(phase);
    };
    ws.onmessage = (m) => handleMessage(ws, m.data);
    ws.onclose = () => logError("Disconnected from server ...");
    ws.onerror = (e) => {
      console.log("212121::", e);
    };
  } catch (err) {
    console.log(err.message);
    logError("Failed to connect to server ... exiting");
    Deno.exit(1);
  }
}

await corefunction();
