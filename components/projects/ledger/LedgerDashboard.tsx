"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ledgerKpis,
  ledgerTransactions,
  mrrSeries,
  type LedgerRole,
  type LedgerTransaction,
} from "@/lib/ledger-data";

function money(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export function LedgerDashboard() {
  const [role, setRole] = useState<LedgerRole>("admin");
  const [statusById, setStatusById] = useState<Partial<Record<string, LedgerTransaction["status"]>>>({});

  const rows = useMemo(() => {
    const mapped = ledgerTransactions.map((t) => ({
      ...t,
      status: statusById[t.id] ?? t.status,
    }));
    if (role === "admin") return mapped;
    return mapped.filter((t) => t.customer === "Northwind Labs" || t.status === "paid");
  }, [role, statusById]);

  return (
    <div className="ledger-shell">
      <aside className="ledger-side">
        <p className="ledger-brand">Ledger</p>
        <nav>
          <span className="on">Overview</span>
          <span>Subscriptions</span>
          <span>Customers</span>
          {role === "admin" ? <span>Team invites</span> : null}
          <span>Settings</span>
        </nav>
        <div className="ledger-role">
          <p>View as</p>
          <div className="role-toggle" role="group" aria-label="Role">
            <button type="button" className={role === "admin" ? "on" : ""} onClick={() => setRole("admin")}>
              Admin
            </button>
            <button type="button" className={role === "member" ? "on" : ""} onClick={() => setRole("member")}>
              Member
            </button>
          </div>
        </div>
      </aside>
      <div className="ledger-main">
        <header className="ledger-head">
          <div>
            <h1>Recurring revenue</h1>
            <p>{role === "admin" ? "Workspace-wide MRR, churn and renewals." : "Your team’s paid subscriptions and upcoming invoices."}</p>
          </div>
        </header>
        <div className="kpi-row">
          <Kpi label="MRR" value={money(ledgerKpis.mrr)} />
          <Kpi label="Churn" value={`${ledgerKpis.churn}%`} />
          <Kpi label="Active subs" value={String(ledgerKpis.active)} />
          <Kpi label="Upcoming renewals" value={String(ledgerKpis.upcomingRenewals)} />
        </div>
        <div className="ledger-chart-card">
          <h2>MRR vs churn (last 7 months)</h2>
          <div className="ledger-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mrrSeries} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "var(--text-2)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis
                  yAxisId="mrr"
                  tick={{ fill: "var(--text-2)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `$${Math.round(v / 1000)}k`}
                />
                <YAxis
                  yAxisId="churn"
                  orientation="right"
                  tick={{ fill: "var(--text-2)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8 }}
                  labelStyle={{ color: "var(--text)" }}
                  formatter={(value, name) => {
                    const n = typeof value === "number" ? value : Number(value);
                    if (name === "mrr") return [money(n), "MRR"];
                    return [`${n}%`, "Churn"];
                  }}
                />
                <Area yAxisId="mrr" type="monotone" dataKey="mrr" stroke="#c47a4a" fill="rgba(196,122,74,0.22)" strokeWidth={2} />
                <Area yAxisId="churn" type="monotone" dataKey="churn" stroke="#3ecf8e" fill="rgba(62,207,142,0.12)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="ledger-table-wrap">
          <div className="ledger-table-head">
            <h2>Recent billing events</h2>
            {role === "admin" ? <span className="chip">Includes failed charges</span> : <span className="chip">Member scope</span>}
          </div>
          <div className="table-scroll">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                  {role === "admin" ? <th>Action</th> : null}
                </tr>
              </thead>
              <tbody>
                    {rows.map((t) => (
                  <TransactionRow
                    key={t.id}
                    tx={t}
                    role={role}
                    onRetry={() => setStatusById((s) => ({ ...s, [t.id]: "paid" }))}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="kpi">
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}

function TransactionRow({
  tx,
  role,
  onRetry,
}: {
  tx: LedgerTransaction;
  role: LedgerRole;
  onRetry: () => void;
}) {
  return (
    <tr>
      <td>{tx.customer}</td>
      <td>{tx.plan}</td>
      <td>
        {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(tx.amount)}
      </td>
      <td>
        <span className={`status status-${tx.status}`}>{tx.status}</span>
      </td>
      <td>{tx.date}</td>
      {role === "admin" ? (
        <td>
          {tx.status === "failed" ? (
            <button type="button" className="ghost-btn table-btn" onClick={onRetry}>
              Retry
            </button>
          ) : (
            "—"
          )}
        </td>
      ) : null}
    </tr>
  );
}
