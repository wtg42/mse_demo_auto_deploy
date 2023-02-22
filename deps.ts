/** url import */
export { parse } from "https://deno.land/std@0.177.0/flags/mod.ts";
export { serve } from "https://deno.land/std@0.177.0/http/server.ts";

/** local import */
export const { handler } = await import("./server.ts");
export const { coreFunc, DefaultDes, DefaultSrcPath } = await import(
  "./client.ts"
);
