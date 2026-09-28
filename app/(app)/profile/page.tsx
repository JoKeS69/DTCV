import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { logoutAction, updateProfileAction } from "@/app/actions/auth";
import { ProfileForm } from "@/components/auth/ProfileForm";

export const metadata: Metadata = {
  title: "Profile",
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/profile");

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 md:px-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-text-dim">
        &gt; User terminal
      </p>
      <h1 className="mt-2 font-mono text-2xl font-semibold uppercase tracking-[0.12em] text-text">
        Profile
      </h1>

      <section className="mt-8 border border-border bg-surface">
        <header className="border-b border-border px-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
          Identity
        </header>
        <dl className="grid gap-3 px-4 py-4 font-mono text-xs uppercase tracking-[0.14em] md:grid-cols-2">
          <div>
            <dt className="text-text-dim">Username</dt>
            <dd className="mt-1 text-text">{session.user.username}</dd>
          </div>
          <div>
            <dt className="text-text-dim">Email</dt>
            <dd className="mt-1 normal-case tracking-normal text-text">
              {session.user.email}
            </dd>
          </div>
          <div>
            <dt className="text-text-dim">Display name</dt>
            <dd className="mt-1 text-text">
              {session.user.displayName ?? session.user.username}
            </dd>
          </div>
          <div>
            <dt className="text-text-dim">Email status</dt>
            <dd className="mt-1 text-online">
              {session.user.emailVerifiedAt ? "Verified" : "Unverified (placeholder flow)"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-4 border border-border bg-surface">
        <header className="border-b border-border px-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-text-muted">
          Update display name
        </header>
        <div className="px-4 py-4">
          <ProfileForm
            action={updateProfileAction}
            defaultDisplayName={session.user.displayName ?? session.user.username}
          />
        </div>
      </section>

      <form action={logoutAction} className="mt-6">
        <button type="submit" className="auth-btn-ghost max-w-xs">
          LOGOUT
        </button>
      </form>
    </main>
  );
}
