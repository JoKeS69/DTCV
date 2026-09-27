export type LedgerRole = "admin" | "member";

export type MrrPoint = {
  month: string;
  mrr: number;
  churn: number;
};

export type LedgerTransaction = {
  id: string;
  customer: string;
  plan: string;
  amount: number;
  status: "paid" | "failed" | "upcoming";
  date: string;
};

export const mrrSeries: MrrPoint[] = [
  { month: "Mar", mrr: 18240, churn: 3.1 },
  { month: "Apr", mrr: 19110, churn: 2.8 },
  { month: "May", mrr: 20480, churn: 2.4 },
  { month: "Jun", mrr: 22190, churn: 2.6 },
  { month: "Jul", mrr: 23840, churn: 2.1 },
  { month: "Aug", mrr: 25120, churn: 1.9 },
  { month: "Sep", mrr: 26890, churn: 1.7 },
];

export const ledgerTransactions: LedgerTransaction[] = [
  { id: "txn_1842", customer: "Northwind Labs", plan: "Growth", amount: 890, status: "paid", date: "2026-09-22" },
  { id: "txn_1841", customer: "Harbor & Co", plan: "Starter", amount: 49, status: "paid", date: "2026-09-22" },
  { id: "txn_1840", customer: "Kite Analytics", plan: "Scale", amount: 2400, status: "upcoming", date: "2026-09-24" },
  { id: "txn_1839", customer: "Pine Street Studio", plan: "Growth", amount: 890, status: "failed", date: "2026-09-21" },
  { id: "txn_1838", customer: "Aster Health", plan: "Starter", amount: 49, status: "paid", date: "2026-09-20" },
  { id: "txn_1837", customer: "Relay Freight", plan: "Scale", amount: 2400, status: "paid", date: "2026-09-19" },
  { id: "txn_1836", customer: "Moss & Grain", plan: "Growth", amount: 890, status: "paid", date: "2026-09-18" },
];

export const ledgerKpis = {
  mrr: 26890,
  churn: 1.7,
  active: 214,
  upcomingRenewals: 18,
};
