import { parse, serve } from "./deps.ts";
export const { handler } = await import("./server.ts");
export const { coreFunc, setDefaultDes, setDefaultSrcPath } = await import(
  "./client.ts"
);
const flags = parse(Deno.args, {
  boolean: ["client", "server"],
  string: ["des_ip", "source_path"],
});

/** start up with client mode  */
if (flags.client) {
  if (flags.des_ip !== undefined) {
    setDefaultDes(flags.des_ip);
  }

  /** 用戶指定 git 路徑 */
  if (flags.source_path !== undefined) {
    setDefaultSrcPath(flags.source_path);
  }

  /** entey of program */
  await coreFunc();
}

/** start up with server mode */
if (flags.server) {
  // 監聽 port
  const port = 8080;
  console.log(`HTTP webserver running.`);
  await serve(handler, { port });
}

/** user doesn't give the program a flag */
if (!flags.client && !flags.server) {
  console.log(
    "%c Opps! start up the program with a flag that must be %c--server or --client.",
    "color: red",
    "color: red; font-weight: bold",
  );
}
