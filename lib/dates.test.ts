import { describe, expect, it } from "vitest";
import { addDays, diffDays, isValidDate, todayISO, weekday } from "./dates";

describe("dates", () => {
  it("todayISO usa la zona horaria pedida, no la del servidor", () => {
    // 2026-11-13 03:30 UTC sigue siendo 12 de noviembre en Ciudad de México (UTC-6)
    const now = new Date("2026-11-13T03:30:00Z");
    expect(todayISO("America/Mexico_City", now)).toBe("2026-11-12");
    expect(todayISO("UTC", now)).toBe("2026-11-13");
  });
  it("addDays cruza mes y año", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });
  it("diffDays es con signo", () => {
    expect(diffDays("2026-11-13", "2026-11-11")).toBe(2);
    expect(diffDays("2026-11-11", "2026-11-13")).toBe(-2);
  });
  it("weekday: 13/11/2026 es viernes", () => {
    expect(weekday("2026-11-13")).toBe(5);
  });
  it("isValidDate", () => {
    expect(isValidDate(2026, 2, 29)).toBe(false);
    expect(isValidDate(2028, 2, 29)).toBe(true);
    expect(isValidDate(2026, 13, 1)).toBe(false);
  });
});
