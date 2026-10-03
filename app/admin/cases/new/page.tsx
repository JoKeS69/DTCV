import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { CaseAdminForm } from "@/components/admin/CaseAdminForm";

export const metadata: Metadata = { title: "Admin · New case" };

export default function AdminNewCasePage() {
  return (
    <AdminShell
      title="New real case"
      subtitle="Mark DEV stubs clearly."
      current="/admin/cases"
    >
      <CaseAdminForm />
    </AdminShell>
  );
}
