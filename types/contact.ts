export const BUDGET_OPTIONS = [
  "Under $1,000",
  "$1,000 – $3,000",
  "$3,000 – $5,000",
  "$5,000+",
] as const;

export const PROJECT_TYPE_OPTIONS = [
  "Website",
  "Web application",
  "API / backend",
  "Optimization / audit",
  "Something else",
] as const;

export type BudgetOption = (typeof BUDGET_OPTIONS)[number];
export type ProjectTypeOption = (typeof PROJECT_TYPE_OPTIONS)[number];

export type ContactPayload = {
  name: string;
  email: string;
  company: string;
  budget: string;
  type: string;
  message: string;
  /** Honeypot — must be empty for humans. */
  website?: string;
};

export type ContactSuccessResponse = {
  ok: true;
};

export type ContactErrorResponse = {
  ok: false;
  error: string;
  fieldErrors?: Partial<Record<keyof ContactPayload, string>>;
};
