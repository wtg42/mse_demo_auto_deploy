export async function sleep(time = 10): Promise<void> {
  return await new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, time);
  });
}

export function printNewLine() {
  Deno.stdout.writeSync(new TextEncoder().encode(`\x1b[0C \x1b[K\r\n`));
}

export function clearLine(len: number) {
  Deno.stdout.writeSync(new TextEncoder().encode(`\x1b[${len}D`));
}

export class Output {
  #beforeLength = 0;

  public print(text: string): void {
    const encode = new TextEncoder();
    const chunk = encode.encode(`\x1b[${this.#beforeLength}D \x1b[K ${text}`);
    Deno.stdout.writeSync(chunk);
    this.#beforeLength = chunk.length;
  }
}
