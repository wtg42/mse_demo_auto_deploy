import { DefaultDes, DefaultSrcPath } from "./client.ts";
import { printNewLine, sleep } from "./util.ts";

// sessionStorage.setItem("ttt", "12");
// console.log(sessionStorage.getItem("ttt"));

const p = Deno.run({
  cmd: [
    "echo",
    "-e \x1b[6n",
  ],
  cwd: ".",
  stdin: "piped",
  stdout: "piped",
  stderr: "piped",
});

const output = await p.output();
console.log(new TextDecoder().decode(output));
Deno.exit();

await Deno.stdout.write(new TextEncoder().encode(`\x1b[0J`));
await sleep(1000);
await Deno.stdout.write(
  new TextEncoder().encode(
    `\x1b[s1234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890`,
  ),
);
await sleep(1000);
await Deno.stdout.write(new TextEncoder().encode(`\x1b[u`));
await sleep(1000);

Deno.exit();
// setDefaultDes("hello")
// setDefaultSrcPath("world")
console.log(DefaultSrcPath);
console.log(DefaultDes);

// Deno.exit();

// --------------------------------------------------

class Output {
  #beforeLength = 0;

  public print(text: string): void {
    const encode = new TextEncoder();
    const chunk = encode.encode(`\x1b[${this.#beforeLength}D \x1b[K ${text}`);
    Deno.stdout.writeSync(chunk);
    this.#beforeLength = chunk.length;
  }
}

async function main(): Promise<void> {
  const output = new Output();
  for (let i = 0; i <= 100; i++) {
    await sleep(10);
    output.print(`${i}%`);
  }
  printNewLine();
}

await main();

// -------------------------------------------
const name = Deno.args[0];
const food = Deno.args[1];
console.log("------------");
console.log(Deno.args);
console.log(`Hello ${name}, I like ${food}!`);
import { parse } from "https://deno.land/std@0.173.0/flags/mod.ts";
const flags = parse(Deno.args, {
  boolean: ["help", "color"],
  string: ["version"],
  default: { color: true },
});
console.log("Wants help?", flags.help);
console.log("Version:", flags.version);
console.log("Wants color?:", flags.color);
console.log("Other:", flags._);
