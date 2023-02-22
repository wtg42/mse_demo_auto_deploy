/** 測試跟開發用套件匯入 */
export {
  assert,
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.177.0/testing/asserts.ts";
export { parse } from "https://deno.land/std@0.177.0/flags/mod.ts";
export { serve } from "https://deno.land/std@0.177.0/http/server.ts";
/** 也可以動態 import */
export const { handler } = await import("./server.ts");
