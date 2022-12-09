import { copy } from "https://deno.land/std@0.166.0/streams/conversion.ts";

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
    cwd: "/Users/shiweiting/side_projects/snmsqr/",
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
  console.log("SERVER >> " + data);
  if (data === "exit") {
    console.log("deploy done!");
    ws.close();
    Deno.exit();
  }
  if (data == "empty_dir_done") {
    go2GitDirectory();
    if (await executeRsync() != 0) {
      ws.close();
      Deno.exit(1);
    }
    ws.close();
    Deno.exit(1);
    // starting install laravel
    ws.send("composer_update");
  }

  if (data == "composer_update_done") {
    console.log("composer_update_done...");
    console.log("preparing for execute artisan command...");
    // starting set laravel
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

function handleError(e: Event | ErrorEvent) {
  console.log(e instanceof ErrorEvent ? e.message : e.type);
}

/**
 * main program
 * 發送 action `empty_dir` 觸發遠端開始
 */
try {
  const ws = new WebSocket("ws://192.168.91.61:8080");
  ws.onopen = () => {
    console.log("Connected to server ...");
    ws.send("empty_dir");
  };
  ws.onmessage = (m) => handleMessage(ws, m.data);
  ws.onclose = () => logError("Disconnected from server ...");
  ws.onerror = (e) => handleError(e);
} catch (err) {
  logError("Failed to connect to server ... exiting");
  handleError(err);
  Deno.exit(1);
}
// notify sever to execute compose update.
