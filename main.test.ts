import { assert, assertEquals, assertExists, parse } from "./dev_deps.ts";

/** 測試 flags.server */
Deno.test("Test Flags #1", () => {
  const flags = parse(Deno.args, {
    boolean: ["client", "server"],
    string: ["des_ip", "source_path"],
  });

  assertExists(
    flags.server,
    "flags.server should not be null or undefined but ture or false.",
  );
  assertExists(
    flags.client,
    "flags.client should not be null or undefined but ture or false.",
  );
  assertEquals(flags.des_ip, undefined);
});
