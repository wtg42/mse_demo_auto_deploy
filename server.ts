import * as fs from "https://deno.land/std@0.175.0/fs/mod.ts";
import { readLines } from "https://deno.land/std@0.175.0/io/read_lines.ts";

// 監聽 port
const opBuffer: string[] = [];

/**
 * serve handle function
 * @param req request from client
 */
export const handler = (req: Request): Response => {
  // 檢查觸發訊息
  if (req.headers.get("upgrade") != "websocket") {
    return new Response(null, { status: 501 });
  }

  const { ws, response } = createWebScoketConnection(req);
  ws.onopen = () => console.log("Connected to client ...");
  ws.onmessage = (m) => handleMessage(ws, m.data);
  ws.onerror = (e) => {
    console.log(e);
    createWebScoketConnection(req);
  };
  // first phase
  addEventListener("empty_dir", async () => {
    try {
      const result = await exeEmptyDir();
      ws.send((result == 0) ? "empty_dir_done" : "empty_dir_failed");
    } catch (error) {
      console.log(error);
      createWebScoketConnection(req);
    }
  }, {
    once: true,
  });

  // second phase
  addEventListener("composer_update", async () => {
    try {
      const result = await exeComposerCmd(ws);
      ws.send(
        (result == 0) ? "composer_update_done" : "composer_update_failed",
      );
    } catch (error) {
      console.log(error);
      createWebScoketConnection(req);
    }
  }, {
    once: true,
  });

  addEventListener("php_artisan", async () => {
    try {
      let result = await exeArtisanCmds(ws);
      result = await chgPermission(ws);
      ws.send((result == 0) ? "php_artisan_done" : "php_artisan_failed");
    } catch (error) {
      console.log(error);
      createWebScoketConnection(req);
    }
  }, {
    once: true,
  });

  addEventListener("connection_close", () => {
    // ws.close();
  });

  return response;
};

/**
 * onmessage hendler trigger
 * @param _ws WebSocket instance
 * @param data client's message is used to trigger event
 */
function handleMessage(_ws: WebSocket, data: string) {
  console.log("EVENT START >> " + data);
  /** 這裡會觸發流程 empty_dir | composer_update | php_artisan */
  dispatchEvent(new Event(data));
}

/**
 * 清空資料夾
 * @returns 0:success 1:failed
 */
async function exeEmptyDir(): Promise<number> {
  // 切換到產品目錄
  Deno.chdir("/usr/local/share/apache");
  const cwd = Deno.cwd().trim();
  if (cwd != "/usr/local/share/apache") {
    return 1;
  }

  // 解鎖產品目錄中上鎖檔案
  const p = Deno.run({
    cmd: [
      "find",
      "/usr/local/share/apache",
      "-flags",
      "+sunlink",
      "-exec",
      "/bin/chflags",
      "nosunlink",
      "{}",
      "\;",
    ],
    stdout: "piped",
    stderr: "piped",
  });

  await p.output();
  const ps = await p.status();
  console.log("[nosunlink]:", ps);
  p.close();
  if (ps.code != 0 && !ps.success) {
    return 1;
  }

  await fs.emptyDir("/usr/local/share/apache/");
  return 0;
}

/**
 * execute composer update command
 * @returns 0:success 1:failed
 */
async function exeComposerCmd(ws: WebSocket): Promise<number> {
  // 切換到產品目錄
  Deno.chdir("/usr/local/share/apache");
  const cwd = Deno.cwd().trim();
  if (cwd != "/usr/local/share/apache") {
    return 1;
  }
  const p = Deno.run({
    cmd: [
      "composer",
      "update",
    ],
    stdout: "piped",
    stderr: "piped",
    stdin: "piped",
  });

  // composer update be executed by root will ask for confirm
  p.stdin.write(new TextEncoder().encode("yes\n"));

  for await (const l of readLines(p.stderr)) {
    opBuffer.push(l);
    ws.send(`[SERVER]: ${l}`);
  }
  console.log("[opBuffer]:", opBuffer);

  const pOutput = new TextDecoder().decode(await p.output());
  console.log(pOutput);

  const ps = await p.status();
  console.log("[composer update]:", ps);
  p.close();
  if (ps.code != 0 && !ps.success) {
    return 1;
  }
  return 0;
}

/**
 * execute php artisan command(key, jwt, i18n)
 * @returns 1 | 0
 */
async function exeArtisanCmds(_ws: WebSocket): Promise<number> {
  // 切換到產品目錄
  Deno.chdir("/usr/local/share/apache");
  const cwd = Deno.cwd().trim();
  if (cwd != "/usr/local/share/apache") {
    return 1;
  }
  const keyCmd = Deno.run({
    cmd: [
      "php",
      "artisan",
      "key:generate",
    ],
    stdout: "piped",
    stderr: "piped",
    stdin: "piped",
  });

  const _keyOutput = new TextDecoder().decode(await keyCmd.output());
  // ws.send(keyOutput);

  const keyStatus = await keyCmd.status();
  console.log("[key:generate]", keyStatus);
  if (keyStatus.code != 0 && !keyStatus.success) {
    keyCmd.close();
    return 1;
  }
  keyCmd.close();

  const jwtCmd = Deno.run({
    cmd: [
      "php",
      "artisan",
      "jwt:secret",
    ],
    stdout: "piped",
    stderr: "piped",
    stdin: "piped",
  });

  const _jwtOutput = new TextDecoder().decode(await jwtCmd.output());
  // ws.send(jwtOutput);

  const jwtStatus = await jwtCmd.status();
  console.log("[jwt:secret]:", jwtStatus);
  jwtCmd.close();
  if (jwtStatus.code != 0 && !jwtStatus.success) {
    return 1;
  }

  const i18nCmd = Deno.run({
    cmd: [
      "php",
      "artisan",
      "i18n:make",
    ],
    stdout: "piped",
    stderr: "piped",
    stdin: "piped",
  });

  const _i18nOutput = new TextDecoder().decode(await i18nCmd.output());
  // ws.send(i18nOutput);

  const i18nStatus = await i18nCmd.status();
  console.log("[i18n:make]:", i18nStatus);
  i18nCmd.close();

  if (i18nStatus.code != 0 && !i18nStatus.success) {
    return 1;
  }
  return 0;
}

async function generatePwrapper(ws: WebSocket): Promise<void> {
  ws.send("generating system's privilege binary...");
  Deno.chdir("/usr/local/share/apache/htdocs/snmsqr/shell");
  const pwCmd = Deno.run({
    cmd: [
      "cc",
      "-o",
      "pwrapper",
      "pwrapper.c",
    ],
  });
  console.log("[pwrapper]:", await pwCmd.status());

  const haltCmd = Deno.run({
    cmd: [
      "cc",
      "-o",
      "halt",
      "halt.c",
    ],
  });
  console.log("[halt]", await haltCmd.status());

  const rebootCmd = Deno.run({
    cmd: [
      "cc",
      "-o",
      "reboot",
      "reboot.c",
    ],
  });
  console.log("[reboot]", await rebootCmd.status());
}

/** Run MSE script */
async function chgPermission(ws: WebSocket): Promise<number> {
  await generatePwrapper(ws);

  ws.send("changing file permission...");

  const workingPath = "/usr/local/share/apache";
  await loopDir.call(ws, workingPath);
  // 執行 chg_privilege.sh
  Deno.chdir("/usr/local/share/apache/htdocs/snmsqr/shell");
  const cwd = Deno.cwd().trim();
  if (cwd != "/usr/local/share/apache/htdocs/snmsqr/shell") {
    return 1;
  }
  const chgCmd = Deno.run({
    cmd: [
      "sh",
      "chg_privilege.sh",
      ">",
      "/dev/null",
      "2>&1",
    ],
    stdout: "piped",
    stderr: "null",
  });
  // for await (const l of readLines(chgCmd.stdout)) {
  //   ws.send(l)
  // }
  // const chgOutput = new TextDecoder().decode(await chgCmd.output());
  // console.log(chgOutput);
  const chgStatus = await chgCmd.status();
  console.log("[chg_privilege.sh]:", chgStatus);
  return 0;
}

/**
 * @param targetPath 修改檔案權限以及子資料夾權限
 */
async function loopDir(targetPath: string): Promise<void> {
  for await (const dirEntry of Deno.readDir(targetPath)) {
    const file = targetPath + "/" + dirEntry.name;
    /** @ts-ignore */
    const ws = this as WebSocket;
    // ws.send(file);
    await Deno.chown(file, 65534, 7);
    await Deno.chmod(file, 0o750);
    if (dirEntry.isDirectory) {
      await loopDir.call(ws, file);
    }
  }
}

/** 創建 WebSocket 連線 */
function createWebScoketConnection(req: Request) {
  const { socket: ws, response } = Deno.upgradeWebSocket(req);
  return { ws, response };
}
