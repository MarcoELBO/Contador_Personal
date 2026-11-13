import { describe, expect, it } from "vitest";
import { authConfigured, createSessionToken, passwordMatches, verifySessionToken } from "./auth";

const cfg = { password: "correcta", secret: "x".repeat(40) };
const NOW = 1_800_000_000_000;

describe("auth", () => {
  it("authConfigured exige contraseña y secreto de 32+ caracteres", () => {
    expect(authConfigured(cfg)).toBe(true);
    expect(authConfigured({ password: "a", secret: "corto" })).toBe(false);
    expect(authConfigured({ secret: cfg.secret })).toBe(false);
    expect(authConfigured({})).toBe(false);
  });

  it("passwordMatches", async () => {
    expect(await passwordMatches("correcta", cfg)).toBe(true);
    expect(await passwordMatches("incorrecta", cfg)).toBe(false);
    expect(await passwordMatches("", cfg)).toBe(false);
    expect(await passwordMatches("correcta", {})).toBe(false);
  });

  it("un token recién creado es válido", async () => {
    const t = await createSessionToken(NOW, cfg);
    expect(await verifySessionToken(t, NOW + 1000, cfg)).toBe(true);
  });

  it("un token vencido no es válido", async () => {
    const t = await createSessionToken(NOW, cfg);
    expect(await verifySessionToken(t, NOW + 31 * 24 * 3600 * 1000, cfg)).toBe(false);
  });

  it("un token alterado o firmado con otro secreto no es válido", async () => {
    const t = await createSessionToken(NOW, cfg);
    const [exp, sig] = t.split(".");
    expect(await verifySessionToken(`${Number(exp) + 99999999}.${sig}`, NOW, cfg)).toBe(false);
    expect(await verifySessionToken(`${exp}.${sig.replace(/.$/, "0")}`, NOW, cfg)).toBe(false);
    expect(await verifySessionToken(t, NOW, { ...cfg, secret: "y".repeat(40) })).toBe(false);
  });

  it("tokens malformados o ausentes se rechazan", async () => {
    for (const bad of [undefined, null, "", "abc", ".", "x.y", "123"]) {
      expect(await verifySessionToken(bad, NOW, cfg)).toBe(false);
    }
  });
});
