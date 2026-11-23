"use client";

<<<<<<< HEAD
import { useEffect, useState } from "react";
import Link from "next/link";
=======
import { useState } from "react";
>>>>>>> 3d15cf437f7342a62ab35a2a9a5a2e615e4b4f99
import Icon from "@/components/Icon";
import Drawer from "@/components/ui/Drawer";
import { SAVED_ACCOUNTS } from "@/lib/earnings.mock";
import { formatRupiah } from "@/lib/format";
<<<<<<< HEAD
import { USE_MOCK } from "@/lib/auth/api";

const MIN_WITHDRAW = 20000;

export default function WithdrawDrawer({ open, onClose, saldoTersedia, accounts: accountsProp, onSubmit, submitting = false, externalError = null }) {
  const accounts = accountsProp ?? (USE_MOCK ? SAVED_ACCOUNTS : []);
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setAccountId((curr) => (accounts.some((a) => a.id === curr) ? curr : accounts[0]?.id || ""));
      setError(null);
    }
  }, [open, accounts]);

  function reset() {
    setAmount("");
    setError(null);
    setAccountId(accounts[0]?.id || "");
=======

const MIN_WITHDRAW = 50000;

export default function WithdrawDrawer({ open, onClose, saldoTersedia, onSubmit }) {
  const [accountId, setAccountId] = useState(SAVED_ACCOUNTS[0].id);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState(null);

  function reset() {
    setAmount("");
    setError(null);
    setAccountId(SAVED_ACCOUNTS[0].id);
>>>>>>> 3d15cf437f7342a62ab35a2a9a5a2e615e4b4f99
  }

  function handleClose() {
    reset();
    onClose();
  }

<<<<<<< HEAD
  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    if (!accountId) {
      setError("Tambahkan rekening tujuan terlebih dahulu di halaman Pengaturan.");
      return;
    }
=======
  function handleSubmit(e) {
    e.preventDefault();
>>>>>>> 3d15cf437f7342a62ab35a2a9a5a2e615e4b4f99
    const n = Number(amount);
    if (!n || n < MIN_WITHDRAW) {
      setError(`Minimal penarikan ${formatRupiah(MIN_WITHDRAW)}`);
      return;
    }
    if (n > saldoTersedia) {
      setError(`Jumlah melebihi saldo tersedia (${formatRupiah(saldoTersedia)})`);
      return;
    }
<<<<<<< HEAD
    const ok = await onSubmit({ amount: n, accountId });
    if (ok !== false) reset();
  }

  const displayError = error || externalError;

=======
    onSubmit({ amount: n, accountId });
    reset();
  }

>>>>>>> 3d15cf437f7342a62ab35a2a9a5a2e615e4b4f99
  return (
    <Drawer open={open} onClose={handleClose} title="Tarik Dana">
      <form onSubmit={handleSubmit}>
        <div className="t-caption mb-8">SALDO TERSEDIA</div>
        <div className="t-h2 mb-20">{formatRupiah(saldoTersedia)}</div>

        <div className="field">
          <label>Rekening Tujuan</label>
<<<<<<< HEAD
          {accounts.length === 0 ? (
            <p className="t-small muted">
              Belum ada rekening tersimpan. <Link href="/settings" className="link-btn">Tambah rekening di Pengaturan</Link>
            </p>
          ) : (
            <select className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
          )}
=======
          <select className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {SAVED_ACCOUNTS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
>>>>>>> 3d15cf437f7342a62ab35a2a9a5a2e615e4b4f99
        </div>

        <div className="field">
          <label>Jumlah Penarikan</label>
          <div className="input-group">
            <span className="input-prefix">Rp</span>
            <input
              className="input"
              type="number"
              min={0}
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setError(null); }}
              placeholder="0"
            />
          </div>
          <button type="button" className="link-btn mt-8" onClick={() => setAmount(String(saldoTersedia))}>
            Tarik semua saldo
          </button>
        </div>

<<<<<<< HEAD
        {displayError && (
          <div className="card mt-8" style={{ background: "var(--error-bg)", borderColor: "transparent", padding: 12 }}>
            <span className="t-small" style={{ color: "var(--error)" }}>{displayError}</span>
          </div>
        )}

        <button type="submit" className="btn btn-primary btn-block btn-lg mt-20" disabled={submitting || accounts.length === 0}>
          <Icon name="arrowUpRight" /> {submitting ? "Memproses..." : "Tarik Dana"}
=======
        {error && (
          <div className="card mt-8" style={{ background: "var(--error-bg)", borderColor: "transparent", padding: 12 }}>
            <span className="t-small" style={{ color: "var(--error)" }}>{error}</span>
          </div>
        )}

        <button type="submit" className="btn btn-primary btn-block btn-lg mt-20">
          <Icon name="arrowUpRight" /> Tarik Dana
>>>>>>> 3d15cf437f7342a62ab35a2a9a5a2e615e4b4f99
        </button>
      </form>
    </Drawer>
  );
}
