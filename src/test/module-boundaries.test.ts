/**
 * Contrato de modularidade — valida estaticamente que nenhum módulo importa
 * caminhos profundos (components/ ou pages/) de outro módulo.
 * Comunicação cross-módulo só pode acontecer via barrel (index.ts) ou
 * via services/, hooks/, data/.
 *
 * Atualize FORBIDDEN_SEGMENTS ou ALLOWED_EXCEPTIONS se a política mudar.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const MODULES_ROOT = resolve(__dirname, "../modules");

/** Subpastas internas de um módulo que nunca podem ser importadas de fora. */
const FORBIDDEN_SEGMENTS = ["components", "pages"] as const;

/**
 * Exceções explícitas (use com extrema parcimônia e justificativa).
 * Formato: `"<modulo-origem> -> <modulo-destino>/<subpath>"`
 */
const ALLOWED_EXCEPTIONS = new Set<string>([]);

const IMPORT_RE =
  /(?:import|export)\s+(?:[^"';]+?\s+from\s+)?["']@\/modules\/([a-zA-Z0-9_-]+)\/([^"']+)["']/g;

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else if (/\.(ts|tsx)$/.test(entry)) acc.push(full);
  }
  return acc;
}

type Violation = {
  file: string;
  line: number;
  from: string;
  to: string;
  subpath: string;
};

function collectViolations(): Violation[] {
  const files = walk(MODULES_ROOT);
  const violations: Violation[] = [];

  for (const file of files) {
    const rel = relative(resolve(__dirname, "../.."), file).replace(/\\/g, "/");
    const sourceModule = rel.split("/")[2]; // src/modules/<x>/...
    const text = readFileSync(file, "utf8");
    const lines = text.split("\n");

    lines.forEach((line, idx) => {
      let m: RegExpExecArray | null;
      const re = new RegExp(IMPORT_RE.source, "g");
      while ((m = re.exec(line)) !== null) {
        const targetModule = m[1];
        const subpath = m[2];
        if (targetModule === sourceModule) continue; // intra-módulo é livre

        const firstSegment = subpath.split("/")[0];
        if (!FORBIDDEN_SEGMENTS.includes(firstSegment as (typeof FORBIDDEN_SEGMENTS)[number])) {
          continue;
        }
        const key = `${sourceModule} -> ${targetModule}/${subpath}`;
        if (ALLOWED_EXCEPTIONS.has(key)) continue;

        violations.push({
          file: rel,
          line: idx + 1,
          from: sourceModule,
          to: targetModule,
          subpath,
        });
      }
    });
  }

  return violations;
}

describe("Contrato modular: isolamento entre src/modules/*", () => {
  it("nenhum módulo importa components/ ou pages/ de outro módulo", () => {
    const violations = collectViolations();
    if (violations.length > 0) {
      const msg = violations
        .map(
          (v) =>
            `  ✗ ${v.file}:${v.line} — "${v.from}" importa "@/modules/${v.to}/${v.subpath}"\n` +
            `    → exponha via @/modules/${v.to} (index.ts) ou mova para services/hooks/data.`,
        )
        .join("\n");
      throw new Error(
        `Encontradas ${violations.length} violação(ões) do contrato modular:\n${msg}`,
      );
    }
    expect(violations).toEqual([]);
  });
});
