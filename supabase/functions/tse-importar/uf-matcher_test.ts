import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { selecionarCsvDaUf, montarMensagemUfAusente } from "./uf-matcher.ts";

const enc = (s: string) => new TextEncoder().encode(s);

Deno.test("selecionarCsvDaUf: encontra CSV da UF solicitada", () => {
  const files = {
    "leiame.pdf": enc("pdf"),
    "votacao_candidato_munzona_2022_BA.csv": enc("conteudo BA"),
    "votacao_candidato_munzona_2022_SP.csv": enc("conteudo SP"),
  };
  const r = selecionarCsvDaUf(files, "SP");
  assert(r.matched);
  if (r.matched) {
    assertEquals(r.file, "votacao_candidato_munzona_2022_SP.csv");
    assertEquals(new TextDecoder().decode(r.bytes), "conteudo SP");
  }
});

Deno.test("selecionarCsvDaUf: case-insensitive na UF", () => {
  const files = {
    "votacao_candidato_munzona_2022_GO.csv": enc("GO"),
  };
  const r = selecionarCsvDaUf(files, "go");
  assert(r.matched);
});

Deno.test("selecionarCsvDaUf: retorna lista de UFs disponíveis quando não encontra", () => {
  const files = {
    "votacao_candidato_munzona_2022_BA.csv": enc("BA"),
    "votacao_candidato_munzona_2022_SP.csv": enc("SP"),
    "votacao_candidato_munzona_2022_RJ.csv": enc("RJ"),
    "leiame.txt": enc("texto"),
  };
  const r = selecionarCsvDaUf(files, "ZZ");
  assert(!r.matched);
  if (!r.matched) {
    assertEquals(r.ufsDisponiveis, ["BA", "RJ", "SP"]);
    assertEquals(r.arquivos.length, 4);
  }
});

Deno.test("selecionarCsvDaUf: ZIP sem nenhum CSV de UF reconhecível", () => {
  const files = { "leiame.pdf": enc("pdf") };
  const r = selecionarCsvDaUf(files, "SP");
  assert(!r.matched);
  if (!r.matched) {
    assertEquals(r.ufsDisponiveis, []);
  }
});

Deno.test("montarMensagemUfAusente: lista UFs disponíveis", () => {
  const msg = montarMensagemUfAusente(2022, "ZZ", ["BA", "RJ", "SP"], []);
  assertStringIncludes(msg, '"ZZ"');
  assertStringIncludes(msg, "2022");
  assertStringIncludes(msg, "BA, RJ, SP");
});

Deno.test("montarMensagemUfAusente: cai para arquivos quando não há UFs", () => {
  const msg = montarMensagemUfAusente(2022, "SP", [], ["leiame.pdf"]);
  assertStringIncludes(msg, "Arquivos no ZIP: leiame.pdf");
});

Deno.test("integração: ZIP real (fflate) sem a UF deve produzir 422 payload", async () => {
  const { zipSync, unzipSync } = await import("https://esm.sh/fflate@0.8.2");
  const zipped = zipSync({
    "votacao_candidato_munzona_2022_BA.csv": enc("a;b;c\n1;2;3\n"),
    "votacao_candidato_munzona_2022_RJ.csv": enc("a;b;c\n4;5;6\n"),
  });
  const files = unzipSync(zipped) as Record<string, Uint8Array>;
  const r = selecionarCsvDaUf(files, "SP");
  assert(!r.matched);
  if (!r.matched) {
    const msg = montarMensagemUfAusente(2022, "SP", r.ufsDisponiveis, r.arquivos);
    // Simula o payload 422 retornado pela edge function
    const payload = {
      status: 422,
      body: { error: msg, uf: "SP", ano: 2022, ufs_disponiveis: r.ufsDisponiveis },
    };
    assertEquals(payload.status, 422);
    assertEquals(payload.body.ufs_disponiveis, ["BA", "RJ"]);
    assertStringIncludes(payload.body.error, "BA, RJ");
  }
});