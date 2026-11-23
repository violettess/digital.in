import { describe, expect, it } from "vitest";
import { duplicateOpenProjectIds } from "@/lib/projects/duplicates";

const project = (id, overrides = {}) => ({
  id,
  title: "Desain Logo",
  category: "Branding",
  description: "Membuat logo untuk toko",
  budget: 200000,
  deadline: "2026-12-05",
  location: "Remote",
  status: "terbuka",
  fromApi: true,
  createdAt: "2026-11-20T10:00:00Z",
  publishedAt: "2026-11-20T10:00:00Z",
  ...overrides,
});

describe("duplicateOpenProjectIds", () => {
  it("keeps the newest identical open project and returns older IDs", () => {
    const older = project("older", { publishedAt: "2026-11-20T10:00:00Z" });
    const newest = project("newest", { publishedAt: "2026-11-22T10:00:00Z" });

    expect(duplicateOpenProjectIds([older, newest])).toEqual(["older"]);
  });

  it("does not cancel active contracts, mock projects, or projects with different details", () => {
    const projects = [
      project("contract", { status: "berjalan", contractId: "c-1" }),
      project("mock", { fromApi: false }),
      project("other-deadline", { deadline: "2026-12-06" }),
    ];

    expect(duplicateOpenProjectIds(projects)).toEqual([]);
  });
});
