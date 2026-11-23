import { describe, expect, it } from "vitest";
import { formatTanggal, getTodayIso } from "@/lib/format";

describe("getTodayIso", () => {
  it("returns today's date in local YYYY-MM-DD format", () => {
    const now = new Date();
    const expected = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    expect(getTodayIso()).toBe(expected);
  });
});

describe("formatTanggal", () => {
  it("formats valid dates using the Indonesian locale", () => {
    expect(formatTanggal("2099-01-01")).toMatch(/1 Jan 2099/);
  });

  it.each([null, undefined, "", "not-a-date"])("returns a placeholder for invalid date %s", (value) => {
    expect(formatTanggal(value)).toBe("—");
  });
});
