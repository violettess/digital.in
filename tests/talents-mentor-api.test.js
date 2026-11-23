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

import { talentsApi, toTalent, fromRecommendation } from "@/lib/talents/api";
import { mentorApi, toReviewItem } from "@/lib/mentor/api";
import { projectsApi, toSuggestedMilestones, fromSuggestedMilestones, toJobCard } from "@/lib/projects/api";
import { validateDraft, newMilestone } from "@/lib/projects-posting";

beforeEach(() => {
  get.mockReset();
  post.mockReset();
});

const student = {
  id: "sp-1", name: "Nadia", university: { id: "u1", name: "UI" }, city: "Depok",
  skills: [{ id: "c1", name: "Desain", level: "ADVANCED" }, { id: "c2", name: "Sosmed", level: "BEGINNER" }],
  portfolio: [{ id: "pf1", title: "Feed", summary: "Feed IG kopi" }],
  portfolio_count: 1, rating_avg: 4.5, completed_contracts_count: 3, is_verified: true,
};

describe("talents adapter & API", () => {
  it("toTalent memetakan profil publik ke bentuk talent", () => {
    const t = toTalent(student);
    expect(t).toMatchObject({
      id: "sp-1", name: "Nadia", uni: "UI", city: "Depok", rating: 4.5, totalProjects: 3,
      badge: "terverifikasi", fromApi: true, rate: 0,
    });
    expect(t.skills).toEqual([{ name: "Desain", level: 3 }, { name: "Sosmed", level: 1 }]);
    expect(t.portfolio[0]).toEqual({ id: "pf1", title: "Feed", icon: "folder" });
  });

  it("list mengambil semua halaman GET /students", async () => {
    get
      .mockResolvedValueOnce({ data: { data: [student], meta: { last_page: 2 } } })
      .mockResolvedValueOnce({ data: { data: [{ ...student, id: "sp-2" }], meta: { last_page: 2 } } });
    const res = await talentsApi.list();
    expect(get).toHaveBeenNthCalledWith(1, "/students", { params: { page: 1 } });
    expect(get).toHaveBeenNthCalledWith(2, "/students", { params: { page: 2 } });
    expect(res.data.map((t) => t.id)).toEqual(["sp-1", "sp-2"]);
  });

  it("list gagal di halaman pertama mengembalikan error", async () => {
    get.mockRejectedValueOnce({ response: { status: 403, data: { error: { code: "ACCOUNT_PENDING_VERIFICATION" } } } });
    const res = await talentsApi.list();
    expect(res.ok).toBe(false);
    expect(res.error.message).toMatch(/terverifikasi/i);
  });

  it("recommendations memanggil endpoint proyek dan menggabungkan skor", async () => {
    get.mockResolvedValueOnce({ data: { data: [{ student_profile_id: "sp-1", match_score: 88, name: "Nadia" }] } });
    const res = await talentsApi.recommendations("p-1");
    expect(get).toHaveBeenCalledWith("/projects/p-1/recommendations");
    const merged = fromRecommendation(res.data[0], toTalent(student));
    expect(merged.matchScore).toBe(88);
    expect(merged.uni).toBe("UI");
    // Tanpa data GET /students tetap menghasilkan talent minimal.
    expect(fromRecommendation({ student_profile_id: "sp-9", name: "X", match_score: 50 }).id).toBe("sp-9");
  });

  it("invite mengirim student_profile_id", async () => {
    post.mockResolvedValueOnce({ data: { data: { id: "inv-1" } } });
    await talentsApi.invite({ projectId: "p-1", studentProfileId: "sp-1", message: "Halo" });
    expect(post).toHaveBeenCalledWith("/projects/p-1/invitations", { student_profile_id: "sp-1", message: "Halo" });
  });
});

describe("milestone saran UMKM", () => {
  const draftMs = [
    { id: "a", name: " Konsep ", description: "", amount: "200000", deadline: "2099-01-10" },
    { id: "b", name: "Final", description: "File akhir", amount: "300000", deadline: "" },
  ];

  it("toSuggestedMilestones membentuk payload backend", () => {
    expect(toSuggestedMilestones(draftMs)).toEqual([
      { title: "Konsep", amount: 200000, due_date: "2099-01-10" },
      { title: "Final", description: "File akhir", amount: 300000 },
    ]);
  });

  it("createAndPublish mengirim suggested_milestones", async () => {
    post.mockResolvedValueOnce({ data: { data: { id: "p-1" } } }).mockResolvedValueOnce({ data: { data: {} } });
    await projectsApi.createAndPublish({ categoryId: "c", title: "T", description: "D", budget: 500000, deadline: "2099-02-01", milestones: draftMs });
    expect(post.mock.calls[0][1].suggested_milestones).toHaveLength(2);
  });

  it("job card membawa saran milestone untuk mahasiswa", () => {
    const card = toJobCard({ id: "p-1", title: "T", suggested_milestones: [{ title: "Konsep", amount: 200000, due_date: "2099-01-10" }] });
    expect(card.suggestedMilestones).toEqual([
      { id: "p-1-sm0", name: "Konsep", description: "", amount: 200000, deadline: "2099-01-10", status: "belum" },
    ]);
    expect(fromSuggestedMilestones(null, "x")).toEqual([]);
  });

  it("apply memakai milestone saran bila dipilih", async () => {
    post.mockResolvedValueOnce({ data: { data: { id: "app-1" } } });
    await projectsApi.apply({
      projectId: "p-1", proposal: "Siap", price: 500000, days: 10, dueDate: "2099-02-01",
      milestones: fromSuggestedMilestones([{ title: "A", amount: 200000 }, { title: "B", amount: 300000, due_date: "2099-01-20" }], "p-1"),
    });
    expect(post.mock.calls[0][1].proposed_milestones).toEqual([
      { title: "A", amount: 200000, due_date: "2099-02-01" },
      { title: "B", amount: 300000, due_date: "2099-01-20" },
    ]);
  });

  it("menerima nominal milestone positif berapa pun dan menolak nol", () => {
    const makeDraft = (amount) => ({
      title: "Logo",
      milestones: [{ ...newMilestone(), name: "A", amount, deadline: "2099-01-01" }],
    });

    expect(validateDraft(makeDraft("1"), "2026-01-01").ok).toBe(true);
    const zero = validateDraft(makeDraft("0"), "2026-01-01");
    expect(zero.ok).toBe(false);
    expect(Object.values(zero.milestoneErrors)[0].amount).toMatch(/lebih dari 0/);
    expect(validateDraft(makeDraft("1.5"), "2026-01-01").ok).toBe(false);
  });
});

describe("mentor review API", () => {
  const queued = {
    id: "m-1", title: "Konsep logo", amount: 200000, due_date: "2099-01-10T00:00:00Z",
    mentor_return_count: 1, max_mentor_returns: 3,
    contract: { contract_no: "CTR-1", project: { title: "Logo kedai" } },
    submissions: [
      { id: "s-1", version_no: 1, notes: "lama", files: [] },
      { id: "s-2", version_no: 2, notes: "baru", files: [{ id: "f-1", file_name: "logo.png", size_bytes: 10 }] },
    ],
  };

  it("toReviewItem memilih submission versi terbaru", () => {
    const item = toReviewItem(queued);
    expect(item).toMatchObject({ milestoneId: "m-1", projectTitle: "Logo kedai", mentorReturns: 1, maxMentorReturns: 3, dueDate: "2099-01-10" });
    expect(item.submission).toEqual({ id: "s-2", version: 2, notes: "baru", files: [{ id: "f-1", name: "logo.png", size: 10 }] });
  });

  it("queue memanggil GET /mentor/review-queue", async () => {
    get.mockResolvedValueOnce({ data: { data: [queued], meta: { total: 1 } } });
    const res = await mentorApi.queue();
    expect(get).toHaveBeenCalledWith("/mentor/review-queue", { params: { page: 1, per_page: 50 } });
    expect(res.data[0].submission.id).toBe("s-2");
  });

  it("review mengirim keputusan dan feedback", async () => {
    post.mockResolvedValueOnce({ data: { data: { status: "NEEDS_CHANGES" } } });
    const res = await mentorApi.review("s-2", { decision: "NEEDS_CHANGES", feedback: "  Warna kurang kontras " });
    expect(post).toHaveBeenCalledWith("/submissions/s-2/mentor-review", { decision: "NEEDS_CHANGES", feedback: "Warna kurang kontras" });
    expect(res.data.status).toBe("NEEDS_CHANGES");
  });

  it("review menerjemahkan 409 menjadi pesan yang jelas", async () => {
    post.mockRejectedValueOnce({ response: { status: 409, data: { error: { code: "INVALID_STATE_TRANSITION" } } } });
    const res = await mentorApi.review("s-2", { decision: "APPROVED" });
    expect(res.ok).toBe(false);
    expect(res.error.message).toMatch(/tidak menunggu review/i);
  });
});
