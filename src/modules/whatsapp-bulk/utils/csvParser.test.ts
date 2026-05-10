import { describe, it, expect } from "vitest";
import { parseCsv } from "./csvParser";

describe("parseCsv", () => {
  it("detecta header e separador vírgula", () => {
    const r = parseCsv("telefone,nome\n5511999999999,Maria\n5511888888888,João");
    expect(r.total).toBe(2);
    expect(r.validos).toBe(2);
    expect(r.itens[0].nome).toBe("Maria");
  });

  it("aceita ponto-e-vírgula e variáveis livres", () => {
    const r = parseCsv("telefone;nome;cidade\n5511999999999;Ana;SP");
    expect(r.itens[0].variaveis).toEqual({ cidade: "SP" });
  });

  it("marca telefones inválidos", () => {
    const r = parseCsv("telefone,nome\n123,Curto\n5511999999999,OK");
    expect(r.validos).toBe(1);
    expect(r.invalidos).toBe(1);
    expect(r.itens[0]._motivo).toMatch(/inválido/i);
  });

  it("detecta duplicados", () => {
    const r = parseCsv("5511999999999,A\n5511999999999,B");
    expect(r.duplicados).toBe(1);
    expect(r.validos).toBe(1);
  });

  it("funciona sem header", () => {
    const r = parseCsv("5511999999999,Maria");
    expect(r.validos).toBe(1);
    expect(r.itens[0].nome).toBe("Maria");
  });

  it("limpa pontuação do telefone", () => {
    const r = parseCsv("telefone\n(11) 99999-9999");
    expect(r.itens[0].telefone).toBe("11999999999");
    expect(r.itens[0]._valido).toBe(true);
  });
});