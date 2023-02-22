/** 預設原始碼目錄 */
export let DefaultSrcPath = "/Users/shiweiting/side_projects/snmsqr";
/** 預設部署 IP */
export let DefaultDes = "192.168.91.61";

let phase = "empty_dir";

/**
 * 修改部署 IP 預設值
 * @param {string} newValue
 */
export function setDefaultDes(newValue: string): void {
  DefaultDes = newValue;
}

/**
 * 修改本地原始碼路徑預設值
 * @param {string} newValue
 */
export function setDefaultSrcPath(newValue: string): void {
  DefaultSrcPath = newValue;
}

/**
 * 檢查目前的 path 並轉到正確的工作目錄
 */
const go2GitDirectory: () => void = (): void => {
  Deno.chdir("/Users/shiweiting/side_projects/snmsqr");
  const cwd = Deno.cwd();
  console.log(`Change current path to %c${cwd}`, "color:blue");

  // make sure current path is the same as git directory
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
    cwd: DefaultSrcPath,
    stdout: "piped",
    stderr: "piped",
    stdin: "piped",
  });

  const _output = await p.output();
  // console.log(new TextDecoder().decode(output));
  const status = await p.status();
  console.log(status);
  if (status.code != 0 && !status.success) {
    p.close();
    return 1;
  }
  p.close();
  return 0;
};

/**
 * 處理從 websocket 傳來的訊息
 * @param {WebSocket} ws
 * @param {string} data
 */
async function handleMessage(
  ws: WebSocket,
  data: string,
): Promise<void> {
  if (data == "empty_dir_done") {
    // 印出前換行讓游標從新的位置開始
    console.log(`\n${data}`);
    go2GitDirectory();
    if (await executeRsync() != 0) {
      ws.close();
      Deno.exit(1);
    }
    /** starting install laravel */
    phase = "composer_update";
    ws.send(`${phase}`);
    return;
  }
  if (data == "composer_update_done") {
    console.log(`\n${data}`);
    console.log(`\npreparing for execute artisan command...`);
    // starting set laravel
    phase = "php_artisan";
    ws.send(`${phase}`);
    return;
  }
  if (data == "php_artisan_done") {
    console.log(`\n${data}`);
    console.log("artisan command process done...");
    ws.close();
    return;
  }
  Deno.stdout.write(new TextEncoder().encode(`\r\x1b[0J\x1b[s`));
  Deno.stdout.write(new TextEncoder().encode(`\x1b[u${data}`));
}

/**
 * Main program
 * 發送 action `empty_dir` 觸發遠端開始
 */
export async function corefunction(): Promise<void> {
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
    ws.onmessage = async (m) => await handleMessage(ws, m.data);
    ws.onclose = () => logError("Disconnected from server ...");
    ws.onerror = (e) => {
      console.log(e);
    };
  } catch (err) {
    console.log(err.message);
    logError("Failed to connect to server ... exiting");
    Deno.exit(1);
  }
}

/** 更新 main 到最新 */
async function gitPullFromMain(): Promise<void> {
  const p = Deno.run({
    cmd: [
      "git",
      "pull",
    ],
    cwd: DefaultSrcPath,
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  });
  await p.status();
  const output = await p.output();
  console.log(new TextDecoder().decode(output));
  p.close();
}

export async function switchToMainBranch(): Promise<string> {
  const p = Deno.run({
    cmd: [
      "git",
      "switch",
      "main",
    ],
    cwd: DefaultSrcPath,
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  });
  const status = await p.status();

  /** 錯誤處理 */
  if (!status.success) {
    await handleCmdErr(p);
  }
  await p.output();

  p.close();
  /** 檢查是否為 main 分支 */
  return await getCurrentGitBranchName();
}

/**
 * get git current branch name
 */
export async function getCurrentGitBranchName(): Promise<string> {
  const p = Deno.run({
    cmd: [
      "git",
      "rev-parse",
      "--abbrev-ref",
      "HEAD",
    ],
    cwd: DefaultSrcPath,
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  });
  await p.status();
  const output = new TextDecoder().decode(await p.output());
  p.close();
  return output;
}

function logError(msg: string) {
  console.log(msg);
  Deno.exit(1);
}

async function handleCmdErr(p: Deno.Process): Promise<void> {
  const errOutput = await p.stderrOutput();
  console.log(new TextDecoder().decode(errOutput));
}
