"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import EarningsSummary from "@/components/earnings/EarningsSummary";
import IncomeChart from "@/components/earnings/IncomeChart";
import EarningsSectionMenu from "@/components/earnings/EarningsSectionMenu";
import LedgerRow from "@/components/earnings/LedgerRow";
import TransactionDetailDrawer from "@/components/earnings/TransactionDetailDrawer";
import WithdrawDrawer from "@/components/earnings/WithdrawDrawer";
import InvoiceDrawer from "@/components/earnings/InvoiceDrawer";
import Icon from "@/components/Icon";
import { getAllProjects, MOCK_TODAY } from "@/lib/projects.mock";
import { SAVED_ACCOUNTS, WITHDRAWALS } from "@/lib/earnings.mock";
import {
  buildTransactions, buildInvoices, summarize, monthlyIncome,
  TX_STATUS_META, WD_STATUS_META, INVOICE_STATUS_META,
} from "@/lib/earnings";
import { USE_MOCK } from "@/lib/auth/api";
import { walletApi, toTransactionRow } from "@/lib/wallet/api";

export default function EarningsView() {
  return (
    <Suspense fallback={null}>
      <EarningsPageInner />
    </Suspense>
  );
}

const TAB_META = {
  transaksi: { title: "Riwayat Transaksi", searchPlaceholder: "Cari judul proyek atau nama klien..." },
  penarikan: { title: "Penarikan Dana", searchPlaceholder: "Cari rekening tujuan..." },
  faktur: { title: "Faktur", searchPlaceholder: "Cari nomor faktur atau nama klien..." },
};

const accountLabel = (id) => SAVED_ACCOUNTS.find((a) => a.id === id)?.label || "-";

function EarningsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = TAB_META[searchParams.get("tab")] ? searchParams.get("tab") : "transaksi";

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(null);
  const [extraWithdrawals, setExtraWithdrawals] = useState([]);
  const [selectedTx, setSelectedTx] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [toast, setToast] = useState(null);

  // --- Data asli dari backend (GET /wallet, /wallet/withdrawals, /bank-accounts) ---
  const [apiWallet, setApiWallet] = useState(null);
  const [apiEntries, setApiEntries] = useState([]);
  const [apiWithdrawals, setApiWithdrawals] = useState([]);
  const [apiAccounts, setApiAccounts] = useState([]);
  const [wdSubmitting, setWdSubmitting] = useState(false);
  const [wdError, setWdError] = useState(null);

  const loadWalletData = useCallback(async () => {
    if (USE_MOCK) return;
    const [wRes, wdRes, accRes] = await Promise.all([
      walletApi.wallet(),
      walletApi.withdrawals(),
      walletApi.bankAccounts(),
    ]);
    if (wRes.ok) {
      setApiWallet(wRes.data?.wallet || { balance: 0, pending_withdrawal: 0 });
      setApiEntries((wRes.data?.entries || []).map(toTransactionRow));
    }
    if (wdRes.ok) setApiWithdrawals(wdRes.data || []);
    if (accRes.ok) setApiAccounts(accRes.data || []);
  }, []);

  useEffect(() => { loadWalletData(); }, [loadWalletData]);

  const projects = useMemo(() => (USE_MOCK ? getAllProjects() : []), []);
  const transactions = useMemo(
    () => (USE_MOCK ? buildTransactions(projects, MOCK_TODAY) : apiEntries),
    [projects, apiEntries]
  );
  const invoices = useMemo(
    () => (USE_MOCK ? buildInvoices(transactions, projects) : []),
    [transactions, projects]
  );

  const withdrawals = useMemo(() => {
    if (!USE_MOCK) {
      return [...apiWithdrawals].sort((a, b) => b.date.localeCompare(a.date));
    }
    return [...extraWithdrawals, ...WITHDRAWALS]
      .map((w) => ({ ...w, accountLabel: accountLabel(w.accountId) }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [extraWithdrawals, apiWithdrawals]);

  const summary = useMemo(() => {
    const base = summarize(transactions, withdrawals);
    if (!USE_MOCK && apiWallet) {
      return {
        ...base,
        saldoTersedia: Number(apiWallet.balance || 0),
        totalPenghasilan: Math.max(base.totalPenghasilan, Number(apiWallet.balance || 0) + base.totalDitarik),
      };
    }
    return base;
  }, [transactions, withdrawals, apiWallet]);

  const todayIso = USE_MOCK ? MOCK_TODAY : new Date().toISOString().slice(0, 10);
  const months = useMemo(() => monthlyIncome(transactions, todayIso, 6), [transactions, todayIso]);

  const dataByTab = { transaksi: transactions, penarikan: withdrawals, faktur: invoices };

  function selectTab(nextTab) {
    setQuery("");
    setStatusFilter(null);
    router.push(`/earnings?tab=${nextTab}`);
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }

  async function handleWithdrawSubmit({ amount, accountId }) {
    if (USE_MOCK) {
      const newWithdrawal = {
        id: `wd-new-${Date.now()}`,
        date: MOCK_TODAY,
        amount,
        accountId,
        status: "diproses",
      };
      setExtraWithdrawals((prev) => [newWithdrawal, ...prev]);
      setWithdrawOpen(false);
      showToast(`Penarikan ${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount)} sedang diproses.`);
      return true;
    }

    setWdSubmitting(true);
    setWdError(null);
    const res = await walletApi.requestWithdrawal({ amount, bankAccountId: accountId });
    setWdSubmitting(false);
    if (!res.ok) {
      setWdError(res.error.message);
      return false;
    }
    setWithdrawOpen(false);
    await loadWalletData();
    showToast(`Penarikan ${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount)} sedang diproses.`);
    return true;
  }

  const items = dataByTab[tab];
  const meta = TAB_META[tab];

  const statusMetaByTab = { transaksi: TX_STATUS_META, penarikan: WD_STATUS_META, faktur: INVOICE_STATUS_META };
  const statusOptions = useMemo(() => {
    const currentMeta = statusMetaByTab[tab];
    const seen = new Map();
    items.forEach((it) => {
      if (!seen.has(it.status) && currentMeta[it.status]) seen.set(it.status, currentMeta[it.status].label);
    });
    return [...seen.entries()].map(([id, label]) => ({ id, label }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, tab]);

  const filtered = useMemo(() => {
    let list = items;
    if (statusFilter) list = list.filter((it) => it.status === statusFilter);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((it) => {
        if (tab === "transaksi") return it.projectTitle.toLowerCase().includes(q) || it.client.toLowerCase().includes(q);
        if (tab === "penarikan") return it.accountLabel.toLowerCase().includes(q);
        return it.number.toLowerCase().includes(q) || it.projectTitle.toLowerCase().includes(q) || it.client.toLowerCase().includes(q);
      });
    }
    return [...list].sort((a, b) => b.date.localeCompare(a.date));
  }, [items, statusFilter, query, tab]);

  function openItem(item) {
    if (tab === "transaksi") setSelectedTx(item);
    else if (tab === "faktur") setSelectedInvoice(item);
  }

  return (
    <>
      <h1 className="t-h1 mb-20">Penghasilan</h1>

      <EarningsSummary summary={summary} onWithdraw={() => setWithdrawOpen(true)} />
      <IncomeChart months={months} />

      <EarningsSectionMenu activeTab={tab} onSelectTab={selectTab} dataByTab={dataByTab} />

      <h2 className="t-h3 mb-16">{meta.title}</h2>

      <div className="project-toolbar mb-16">
        <div className="project-search">
          <Icon name="search" />
          <input
            className="input"
            placeholder={meta.searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="row gap-8" style={{ flexWrap: "wrap" }}>
          <button
            type="button"
            className={`chip-filter ${statusFilter === null ? "active" : ""}`}
            onClick={() => setStatusFilter(null)}
          >
            Semua Status
          </button>
          {statusOptions.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`chip-filter ${statusFilter === s.id ? "active" : ""}`}
              onClick={() => setStatusFilter(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
        {tab === "penarikan" && (
          <button type="button" className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }} onClick={() => setWithdrawOpen(true)}>
            <Icon name="arrowUpRight" /> Tarik Dana
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">Tidak ada data yang cocok.</div>
      ) : (
        <div className="job-feed-list">
          {filtered.map((item) => (
            <LedgerRow key={item.id} variant={tab} item={item} onClick={openItem} />
          ))}
        </div>
      )}

      <TransactionDetailDrawer transaction={selectedTx} open={!!selectedTx} onClose={() => setSelectedTx(null)} />
      <InvoiceDrawer
        invoice={selectedInvoice}
        open={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        onDownload={() => showToast("Unduhan faktur belum tersedia di prototipe ini.")}
      />
      <WithdrawDrawer
        open={withdrawOpen}
        onClose={() => { setWithdrawOpen(false); setWdError(null); }}
        saldoTersedia={summary.saldoTersedia}
        accounts={USE_MOCK ? SAVED_ACCOUNTS : apiAccounts}
        onSubmit={handleWithdrawSubmit}
        submitting={wdSubmitting}
        externalError={wdError}
      />

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
