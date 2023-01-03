import { printNewLine, sleep } from "./util.ts";

class Output {
  #beforeLength = 0;

  public print(text: string): void {
    const encode = new TextEncoder();
    const chunk = encode.encode(`\x1b[${this.#beforeLength}D \x1b[K ${text}`);
    Deno.stdout.writeSync(chunk);
    this.#beforeLength = chunk.length;
  }
}

async function main() {
  const output = new Output();
  for (let i = 0; i <= 100; i++) {
    await sleep(10);
    output.print(`${i}%`);
  }
  printNewLine();
}

main();
