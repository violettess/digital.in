import { describe, it, expect, vi, beforeEach } from "vitest";

const get = vi.fn();
const post = vi.fn();
const put = vi.fn();

vi.mock("@/lib/api", () => ({
  api: { get: (...a) => get(...a), post: (...a) => post(...a), put: (...a) => put(...a) },
  parseApiError: (err) => {
    const r = err?.response;
    if (!r) return { status: 0, code: "NETWORK", message: "", details: null };
    const b = r.data?.error || {};
    return { status: r.status, code: b.code || `HTTP_${r.status}`, message: b.message || "", details: b.details ?? null };
  },
}));

import { projectsApi } from "@/lib/projects/api";
import { walletApi } from "@/lib/wallet/api";
import { chatApi } from "@/lib/chat/api";
import { notificationsApi } from "@/lib/notifications/api";

const input = { categoryId: "cat-1", title: "Logo", description: "Desain logo", budget: 1500000.4, deadline: "2099-01-01" };

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  put.mockReset();
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

describe("projectsApi.mine", () => {
  it("tidak menampilkan draft gagal-publish sebagai proyek terbuka", async () => {
    get.mockResolvedValue({
      data: { data: [
        { id: "draft-1", status: "DRAFT", title: "Percobaan lama" },
        { id: "open-1", status: "OPEN", title: "Proyek aktif" },
      ] },
    });

    const res = await projectsApi.mine("Kopi");

    expect(res.ok).toBe(true);
    expect(res.data.map((project) => project.id)).toEqual(["open-1"]);
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

  it("dapat membatalkan proyek terbuka milik UMKM", async () => {
    post.mockResolvedValueOnce({ data: { data: { id: "p-1", status: "CANCELLED" } } });

    const res = await projectsApi.cancelProject("p-1");

    expect(post).toHaveBeenCalledWith("/projects/p-1/cancel");
    expect(res).toEqual({ ok: true, data: { id: "p-1", status: "CANCELLED" }, meta: {} });
  });

  it("mengirim perubahan proyek dan milestone saran ke endpoint update", async () => {
    put.mockResolvedValueOnce({ data: { data: { id: "p-1", title: "Identitas baru" } } });

    const res = await projectsApi.updateProject("p-1", {
      categoryId: "cat-2",
      title: "Identitas baru",
      description: "Desain identitas",
      budgetMin: 100000,
      budgetMax: 250000,
      deadline: "2099-01-10",
      city: "Bandung",
      milestones: [{
        name: "Riset",
        description: "Riset kebutuhan",
        amount: "50000",
        deadline: "2099-01-05",
      }],
    });

    expect(put).toHaveBeenCalledWith("/projects/p-1", {
      category_id: "cat-2",
      title: "Identitas baru",
      description: "Desain identitas",
      budget_min: 100000,
      budget_max: 250000,
      deadline: "2099-01-10",
      city: "Bandung",
      suggested_milestones: [{
        title: "Riset",
        description: "Riset kebutuhan",
        amount: 50000,
        due_date: "2099-01-05",
      }],
    });
    expect(res.ok).toBe(true);
  });

  it("mengirim null untuk menghapus seluruh milestone saran", async () => {
    put.mockResolvedValueOnce({ data: { data: { id: "p-1" } } });

    await projectsApi.updateProject("p-1", {
      categoryId: "cat-1",
      title: "Logo",
      description: "Desain logo",
      budgetMin: 100000,
      budgetMax: 100000,
      deadline: "2099-01-10",
      milestones: [],
    });

    expect(put.mock.calls[0][1].suggested_milestones).toBeNull();
  });
});

describe("projectsApi lamaran, kontrak & rating", () => {
  it("memakai tenggat proyek dari daftar kontrak, bukan tanggal mulai kontrak", async () => {
    get.mockResolvedValueOnce({
      data: { data: [{
        id: "c-1",
        status: "IN_PROGRESS",
        created_at: "2026-11-23T10:00:00Z",
        project: { id: "p-1", title: "Desain Logo", deadline: "2026-12-05" },
      }] },
    });

    const res = await projectsApi.contracts();

    expect(res.ok).toBe(true);
    expect(res.data[0].deadline).toBe("2026-12-05");
  });

  it("mine dan open memetakan daftar proyek", async () => {
    get.mockResolvedValueOnce({
      data: { data: [{ id: "p-1", title: "Menu", status: "OPEN", budget_min: 500000, budget_max: 500000, deadline: "2099-01-01" }] },
    });
    const mine = await projectsApi.mine("Kopi");
    expect(mine.ok).toBe(true);
    expect(mine.data[0].client).toBe("Kopi");
    expect(mine.data[0].status).toBe("terbuka");
  });

  it("apply mengirim lamaran dengan proposed_milestones", async () => {
    post.mockResolvedValueOnce({ data: { data: { id: "app-1" } } });
    const res = await projectsApi.apply({ projectId: "p-1", proposal: "Siap", price: 500000, days: 7, dueDate: "2099-01-01" });
    expect(post).toHaveBeenCalledWith("/projects/p-1/applications", {
      proposal: "Siap",
      offered_price: 500000,
      estimated_days: 7,
      proposed_milestones: [{ title: "Penyelesaian proyek", amount: 500000, due_date: "2099-01-01" }],
    });
    expect(res.ok).toBe(true);
  });

  it("mengirim milestone kustom yang dibuat mahasiswa", async () => {
    post.mockResolvedValueOnce({ data: { data: { id: "app-2" } } });
    const milestones = [
      { name: "Riset", description: "Riset kebutuhan", amount: 80000, deadline: "2099-01-03" },
      { name: "Desain final", description: "", amount: 120000, deadline: "2099-01-05" },
    ];

    await projectsApi.apply({
      projectId: "p-1",
      proposal: "Saya siap",
      price: 200000,
      days: 7,
      dueDate: "2099-01-05",
      milestones,
    });

    expect(post).toHaveBeenCalledWith("/projects/p-1/applications", {
      proposal: "Saya siap",
      offered_price: 200000,
      estimated_days: 7,
      proposed_milestones: [
        { title: "Riset", description: "Riset kebutuhan", amount: 80000, due_date: "2099-01-03" },
        { title: "Desain final", amount: 120000, due_date: "2099-01-05" },
      ],
    });
  });

  it("rateContract mengirim skor dan target ke /contracts/{id}/ratings", async () => {
    post.mockResolvedValueOnce({ data: { data: { id: "r-1" } } });
    const res = await projectsApi.rateContract("c-1", { target: "STUDENT", score: 5, comment: "Bagus" });
    expect(post).toHaveBeenCalledWith("/contracts/c-1/ratings", { target: "STUDENT", score: 5, comment: "Bagus" });
    expect(res.ok).toBe(true);
  });

  it("mengirim pembayaran escrow, submission, review, sengketa, pembatalan, dan undangan", async () => {
    post.mockResolvedValue({ data: { data: { id: "ok" } } });

    await projectsApi.pay("c-1", "VA");
    await projectsApi.submitWork("m-1", { notes: "Selesai", files: [new Blob(["x"], { type: "text/plain" })] });
    await projectsApi.clientReview("s-1", { decision: "APPROVED", feedback: null });
    await projectsApi.dispute("m-1", "Tidak sesuai");
    await projectsApi.requestCancellation("c-1", { reason: "Berubah", reopenProject: true });
    await projectsApi.respondCancellation("cl-1", "Setuju");
    await projectsApi.withdrawCancellation("cl-1");
    await projectsApi.acceptInvitation("i-1");
    await projectsApi.declineInvitation("i-2");

    expect(post).toHaveBeenCalledWith("/contracts/c-1/payments", { method: "VA" });
    expect(post).toHaveBeenCalledWith("/milestones/m-1/submissions", expect.any(FormData), { timeout: 120000 });
    expect(post).toHaveBeenCalledWith("/submissions/s-1/client-review", { decision: "APPROVED", feedback: null });
    expect(post).toHaveBeenCalledWith("/milestones/m-1/disputes", { reason: "Tidak sesuai" });
    expect(post).toHaveBeenCalledWith("/contracts/c-1/cancellations", { reason: "Berubah", reopen_project: true });
    expect(post).toHaveBeenCalledWith("/cancellations/cl-1/responses", { response: "Setuju" });
    expect(post).toHaveBeenCalledWith("/cancellations/cl-1/withdraw");
    expect(post).toHaveBeenCalledWith("/invitations/i-1/accept");
    expect(post).toHaveBeenCalledWith("/invitations/i-2/decline");
  });
});

describe("walletApi, chatApi & notificationsApi", () => {
  it("requestWithdrawal mengirim POST /wallet/withdrawals", async () => {
    post.mockResolvedValueOnce({ data: { data: { id: "wd-1", amount: 50000, status: "PENDING" } } });
    const res = await walletApi.requestWithdrawal({ amount: 50000, bankAccountId: "ba-1" });
    expect(post).toHaveBeenCalledWith("/wallet/withdrawals", { amount: 50000, bank_account_id: "ba-1" });
    expect(res.ok).toBe(true);
    expect(res.data.status).toBe("diproses");
  });

  it("chatApi.send mengirim pesan ke /conversations/{id}/messages", async () => {
    post.mockResolvedValueOnce({ data: { data: { id: "m-1", sender_id: "u-1", body: "Halo" }, meta: {} } });
    const res = await chatApi.send("conv-1", "Halo", "u-1");
    expect(post).toHaveBeenCalledWith("/conversations/conv-1/messages", { body: "Halo" });
    expect(res.ok).toBe(true);
    expect(res.data.from).toBe("me");
  });

  it("notificationsApi.list mengembalikan daftar & unreadCount", async () => {
    get.mockResolvedValueOnce({ data: { data: [{ id: "n-1", title: "Baru" }], meta: { unread_count: 2 } } });
    const res = await notificationsApi.list();
    expect(res.ok).toBe(true);
    expect(res.unreadCount).toBe(2);
  });
});
