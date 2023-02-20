import { parse } from "https://deno.land/std@0.175.0/flags/mod.ts";
import { serve } from "https://deno.land/std@0.175.0/http/server.ts";

const flags = parse(Deno.args, {
  boolean: ["client", "server"],
  string: ["des_ip", "source_path"],
});

/** start up with client mode  */
if (flags.client) {
  const { corefunction, DefaultDes, DefaultSrcPath } = await import(
    "./client.ts"
  );

  if (flags.des_ip === undefined) {
    flags.des_ip = DefaultDes;
  }

  /** 部署機器沒指定採用預設值 */
  if (flags.source_path === undefined) {
    flags.source_path = DefaultSrcPath;
  }

  /** entey of program */
  await corefunction();
}

/** start up with server mode */
if (flags.server) {
  const { handler } = await import("./server.ts");

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
