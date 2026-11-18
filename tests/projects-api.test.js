import { describe, it, expect, vi, beforeEach } from "vitest";

const get = vi.fn();
const post = vi.fn();

vi.mock("@/lib/api", () => ({
  api: { get: (...a) => get(...a), post: (...a) => post(...a) },
  parseApiError: (err) => {
    const r = err?.response;
    if (!r) return { status: 0, code: "NETWORK", message: "", details: null };
    const b = r.data?.error || {};
    return { status: r.status, code: b.code || `HTTP_${r.status}`, message: b.message || "", details: b.details ?? null };
  },
}));

import { projectsApi } from "@/lib/projects/api";

const input = { categoryId: "cat-1", title: "Logo", description: "Desain logo", budget: 1500000.4, deadline: "2099-01-01" };

beforeEach(() => {
  get.mockReset();
  post.mockReset();
});

describe("projectsApi.categories", () => {
  it("mengembalikan daftar kategori", async () => {
    get.mockResolvedValue({ data: { data: [{ id: "cat-1", name: "Desain", slug: "desain" }] } });
    const res = await projectsApi.categories();
    expect(get).toHaveBeenCalledWith("/categories");
    expect(res).toEqual({ ok: true, data: [{ id: "cat-1", name: "Desain", slug: "desain" }] });
  });

  it("gagal dengan pesan jaringan", async () => {
    get.mockRejectedValue(new Error("down"));
    const res = await projectsApi.categories();
    expect(res.ok).toBe(false);
    expect(res.error.message).toMatch(/terhubung/i);
  });
});

describe("projectsApi.createAndPublish", () => {
  it("POST /projects lalu /publish dengan anggaran dibulatkan", async () => {
    post.mockResolvedValueOnce({ data: { data: { id: "p-1" } } }).mockResolvedValueOnce({ data: { data: {} } });
    const res = await projectsApi.createAndPublish(input);
    expect(post).toHaveBeenNthCalledWith(1, "/projects", {
      category_id: "cat-1", title: "Logo", description: "Desain logo",
      budget_min: 1500000, budget_max: 1500000, deadline: "2099-01-01",
    });
    expect(post).toHaveBeenNthCalledWith(2, "/projects/p-1/publish");
    expect(res).toEqual({ ok: true, data: { id: "p-1" } });
  });

  it("tidak memanggil publish bila create gagal validasi", async () => {
    post.mockRejectedValueOnce({
      response: { status: 422, data: { error: { code: "VALIDATION_FAILED", message: "x", details: { deadline: ["Tenggat harus setelah hari ini"] } } } },
    });
    const res = await projectsApi.createAndPublish(input);
    expect(post).toHaveBeenCalledTimes(1);
    expect(res.ok).toBe(false);
    expect(res.error.message).toBe("Tenggat harus setelah hari ini");
  });

  it("melaporkan gagal bila publish ditolak", async () => {
    post.mockResolvedValueOnce({ data: { data: { id: "p-1" } } }).mockRejectedValueOnce({
      response: { status: 403, data: { error: { code: "ACCOUNT_PENDING_VERIFICATION", message: "" } } },
    });
    const res = await projectsApi.createAndPublish(input);
    expect(res.ok).toBe(false);
    expect(res.error.message).toMatch(/belum terverifikasi/i);
  });
});
