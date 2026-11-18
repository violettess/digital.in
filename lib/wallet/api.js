// Dompet, riwayat penarikan, dan rekening bank mahasiswa/mentor (Laravel -> Neon).
import { api, parseApiError } from "@/lib/api";

function messageFrom(err) {
  const e = parseApiError(err);
  if (e.code === "NETWORK") return "Tidak dapat terhubung ke server, coba lagi";
  if (e.code === "VALIDATION_FAILED" && e.details && typeof e.details === "object") {
    const first = Object.values(e.details)[0];
    return (Array.isArray(first) ? first[0] : String(first)) || "Periksa kembali isian";
  }
  if (e.code === "ACCOUNT_PENDING_VERIFICATION") return "Akunmu belum terverifikasi";
  return e.message || "Terjadi kesalahan, coba lagi";
}

async function call(fn) {
  try {
    const res = await fn();
    return { ok: true, data: res.data?.data, meta: res.data?.meta || {} };
  } catch (err) {
    return { ok: false, error: { message: messageFrom(err), code: parseApiError(err).code } };
  }
}

const day = (iso) => (iso ? String(iso).slice(0, 10) : new Date().toISOString().slice(0, 10));
const PAYOUT_STATUS = {
  COMPLETED: "berhasil",
  SUCCEEDED: "berhasil",
  PAID: "berhasil",
  PENDING: "diproses",
  PROCESSING: "diproses",
  FAILED: "gagal",
  REJECTED: "gagal",
};

export function toAccountOption(a) {
  const masked = a.masked_account_number || (a.account_number_last4 ? `•••• ${a.account_number_last4}` : a.account_number || "");
  return {
    id: a.id,
    label: [a.provider_code, masked, a.account_holder_name ? `(${a.account_holder_name})` : ""].filter(Boolean).join(" "),
    isPrimary: !!a.is_primary,
  };
}

export function toWithdrawalRow(p) {
  const acc = p.bank_account || p.bankAccount;
  return {
    id: p.id,
    date: day(p.requested_at || p.created_at),
    amount: Number(p.amount || 0),
    accountId: p.bank_account_id || acc?.id || "",
    accountLabel: acc ? toAccountOption(acc).label : "-",
    status: PAYOUT_STATUS[p.status] || "diproses",
    note: p.failure_reason || null,
  };
}

export function toTransactionRow(e, idx = 0) {
  const tx = e.transaction || {};
  const amount = Math.abs(Number(e.amount || 0));
  return {
    id: e.id || `entry-${idx}`,
    projectId: tx.reference_id || e.id,
    projectTitle: tx.description || tx.type || "Transaksi Dompet",
    client: "Digital.in",
    milestoneIndex: idx + 1,
    milestoneName: tx.type || "Pencairan",
    persen: 100,
    metode: "Escrow",
    gross: amount,
    fee: 0,
    net: amount,
    status: "dicairkan",
    date: day(e.created_at || tx.created_at),
    note: null,
  };
}

export const walletApi = {
  wallet: () => call(() => api.get("/wallet")),
  bankAccounts: () => call(() => api.get("/bank-accounts"))
    .then((res) => (res.ok ? { ok: true, data: (res.data || []).map(toAccountOption) } : res)),
  withdrawals: () => call(() => api.get("/wallet/withdrawals"))
    .then((res) => (res.ok ? { ok: true, data: (res.data || []).map(toWithdrawalRow) } : res)),
  requestWithdrawal: ({ amount, bankAccountId }) => call(() => api.post("/wallet/withdrawals", {
    amount: Math.round(Number(amount)),
    bank_account_id: bankAccountId,
  })).then((res) => (res.ok ? { ok: true, data: toWithdrawalRow(res.data) } : res)),
};
