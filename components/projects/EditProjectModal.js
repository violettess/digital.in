"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import Modal from "@/components/ui/Modal";
import { projectsApi } from "@/lib/projects/api";
import { getTodayIso } from "@/lib/format";
import { newMilestone } from "@/lib/projects-posting";

export default function EditProjectModal({ open, project, onClose, onUpdated }) {
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState(null);
  const [categoryRequest, setCategoryRequest] = useState(0);
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [deadline, setDeadline] = useState("");
  const [city, setCity] = useState("");
  const [milestones, setMilestones] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !project) return;
    setTitle(project.title || "");
    setCategoryId(project.categoryId || "");
    setDescription(project.description || "");
    setBudgetMin(String(project.budgetMin ?? project.budget ?? ""));
    setBudgetMax(String(project.budgetMax ?? project.budget ?? ""));
    setDeadline(project.deadline || "");
    setCity(project.city || "");
    setMilestones((project.milestones || []).map((milestone) => ({
      ...milestone,
      name: milestone.name || "",
      description: milestone.description || "",
      amount: String(milestone.amount ?? ""),
      deadline: milestone.deadline || "",
    })));
    setSaving(false);
    setError(null);
  }, [open, project]);

  function updateMilestone(id, patch) {
    setMilestones((list) => list.map((milestone) => (
      milestone.id === id ? { ...milestone, ...patch } : milestone
    )));
  }

  function addMilestone() {
    setMilestones((list) => (list.length >= 20 ? list : [...list, newMilestone()]));
  }

  function removeMilestone(id) {
    setMilestones((list) => list.filter((milestone) => milestone.id !== id));
  }

  useEffect(() => {
    if (!open) return;
    let active = true;
    setCategoriesLoading(true);
    setCategoriesError(null);
    projectsApi.categories().then((res) => {
      if (!active) return;
      if (!res.ok) {
        setCategories([]);
        setCategoriesError(res.error.message);
      } else {
        const loadedCategories = res.data || [];
        setCategories(loadedCategories);
        if (!loadedCategories.some((category) => category.id === project.categoryId)) {
          setCategoriesError("Kategori proyek ini tidak tersedia. Pilih kategori lain sebelum menyimpan.");
        }
      }
      setCategoriesLoading(false);
    });
    return () => { active = false; };
  }, [open, categoryRequest, project?.id, project?.categoryId]);

  async function save() {
    if (!project || saving) return;
    setError(null);
    if (!title.trim()) return setError("Judul proyek wajib diisi.");
    if (!categoryId) return setError("Pilih kategori proyek.");
    if (!description.trim()) return setError("Deskripsi proyek wajib diisi.");
    const min = Number(budgetMin);
    const max = Number(budgetMax);
    if (!Number.isSafeInteger(min) || min <= 0 || !Number.isSafeInteger(max) || max <= 0) {
      return setError("Anggaran harus berupa bilangan Rupiah bulat lebih dari 0.");
    }
    if (max < min) return setError("Anggaran maksimum tidak boleh lebih kecil dari anggaran minimum.");
    if (!deadline || deadline < getTodayIso()) return setError("Tenggat harus hari ini atau setelahnya.");
    if (milestones.length > 20) return setError("Maksimal 20 milestone saran.");
    if (milestones.some((milestone) => !milestone.name.trim()
      || !Number.isSafeInteger(Number(milestone.amount))
      || Number(milestone.amount) <= 0
      || (milestone.deadline && milestone.deadline < getTodayIso()))) {
      return setError("Isi nama dan nominal positif untuk setiap milestone; tenggat tidak boleh di masa lalu.");
    }

    setSaving(true);
    const res = await projectsApi.updateProject(project.id, {
      categoryId,
      title: title.trim(),
      description: description.trim(),
      budgetMin: min,
      budgetMax: max,
      deadline,
      city: city.trim(),
      milestones,
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    onUpdated?.();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Proyek" width={680}>
      <div className="pp-body">
        <div className="field">
          <label htmlFor="edit-project-title">Judul proyek</label>
          <input id="edit-project-title" className="input" value={title} maxLength={255} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="edit-project-category">Kategori / bidang</label>
          <select
            id="edit-project-category"
            className="input"
            value={categoryId}
            disabled={categoriesLoading || categories.length === 0}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setCategoriesError(null);
            }}
          >
            {!categoryId && <option value="">{categoriesLoading ? "Memuat kategori..." : "Pilih kategori"}</option>}
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          {categoriesError && (
            <div className="row gap-8 mt-8" role="alert">
              <span className="pp-error">{categoriesError}</span>
              <button type="button" className="btn btn-secondary btn-sm" disabled={categoriesLoading} onClick={() => setCategoryRequest((n) => n + 1)}>
                {categoriesLoading ? "Memuat..." : "Coba lagi"}
              </button>
            </div>
          )}
        </div>
        <div className="field">
          <label htmlFor="edit-project-description">Deskripsi proyek</label>
          <textarea id="edit-project-description" className="input" rows={4} maxLength={4000} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="row gap-8">
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="edit-project-budget-min">Anggaran minimum (Rp)</label>
            <input id="edit-project-budget-min" className="input" type="number" min="1" step="1" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="edit-project-budget-max">Anggaran maksimum (Rp)</label>
            <input id="edit-project-budget-max" className="input" type="number" min="1" step="1" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} />
          </div>
        </div>
        <div className="row gap-8">
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="edit-project-deadline">Tenggat</label>
            <input id="edit-project-deadline" className="input" type="date" min={getTodayIso()} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="edit-project-city">Kota (opsional)</label>
            <input id="edit-project-city" className="input" maxLength={120} value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
        </div>
        <div className="field mt-12">
          <div className="row-between mb-8">
            <label style={{ marginBottom: 0 }}>Milestone saran UMKM (opsional)</label>
            <button type="button" className="btn btn-secondary btn-sm" onClick={addMilestone} disabled={milestones.length >= 20}>
              <Icon name="plus" /> Tambah
            </button>
          </div>
          {milestones.length === 0 ? (
            <p className="t-caption muted">Belum ada milestone saran. Tambahkan jika ingin menampilkannya ke mahasiswa.</p>
          ) : (
            <div className="pp-milestones">
              {milestones.map((milestone, index) => (
                <div key={milestone.id} className="pp-ms-card">
                  <div className="row-between mb-8">
                    <span className="settings-item-title">Milestone {index + 1}</span>
                    <button type="button" className="fp-icon-btn danger" onClick={() => removeMilestone(milestone.id)} aria-label={`Hapus milestone saran ${index + 1}`}>
                      <Icon name="trash" />
                    </button>
                  </div>
                  <div className="field" style={{ marginBottom: 10 }}>
                    <label htmlFor={`edit-ms-title-${milestone.id}`}>Nama milestone</label>
                    <input id={`edit-ms-title-${milestone.id}`} className="input" maxLength={255} value={milestone.name} onChange={(e) => updateMilestone(milestone.id, { name: e.target.value })} />
                  </div>
                  <div className="field" style={{ marginBottom: 10 }}>
                    <label htmlFor={`edit-ms-description-${milestone.id}`}>Deskripsi singkat (opsional)</label>
                    <input id={`edit-ms-description-${milestone.id}`} className="input" maxLength={2000} value={milestone.description} onChange={(e) => updateMilestone(milestone.id, { description: e.target.value })} />
                  </div>
                  <div className="pp-ms-grid">
                    <div className="field" style={{ marginBottom: 0 }}>
                      <label htmlFor={`edit-ms-amount-${milestone.id}`}>Nominal (Rp)</label>
                      <input id={`edit-ms-amount-${milestone.id}`} className="input" type="number" min="1" step="1" value={milestone.amount} onChange={(e) => updateMilestone(milestone.id, { amount: e.target.value })} />
                    </div>
                    <div className="field" style={{ marginBottom: 0 }}>
                      <label htmlFor={`edit-ms-date-${milestone.id}`}>Tenggat (opsional)</label>
                      <input id={`edit-ms-date-${milestone.id}`} className="input" type="date" min={getTodayIso()} value={milestone.deadline} onChange={(e) => updateMilestone(milestone.id, { deadline: e.target.value })} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {error && <div className="pp-error" role="alert">{error}</div>}
        <div className="row gap-8" style={{ justifyContent: "flex-end", marginTop: 16 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Batal</button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={saving || categoriesLoading || !!categoriesError}>
            {saving ? <><Icon name="activity" /> Menyimpan...</> : "Simpan Perubahan"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
