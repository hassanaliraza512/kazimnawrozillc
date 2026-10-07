"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const r = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: email, password }),
    });
    const d = await r.json();
    if (!r.ok) setError(d.error || "Sign in failed.");
    else router.push("/admin");
    setBusy(false);
  }

  return (
    <main className="admin-login min-h-screen grid place-items-center bg-[var(--ivory)] px-6">
      <form onSubmit={submit} className="w-full max-w-md border border-[var(--line)] bg-white p-8 shadow-sm">
        <BrandLogo href="/" showName className="justify-center" imageClassName="h-28 md:h-28" />
        <h1 className="mt-3 text-center font-serif text-4xl">Admin sign in</h1>
        <p className="mt-3 text-center text-sm leading-6 text-[var(--muted)]">Welcome back to your storefront command center. Manage orders, inventory, and customer experiences from one elegant dashboard.</p>
        <label className="mt-7 block text-sm">Username<input className="mt-2 w-full border border-[var(--line)] bg-[var(--paper)] p-3" type="text" required value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label className="mt-4 block text-sm">Password<input className="mt-2 w-full border border-[var(--line)] bg-[var(--paper)] p-3" type="password" required value={password} onChange={e => setPassword(e.target.value)} /></label>
        {error && <p className="mt-4 text-sm text-[#8a3328]">{error}</p>}
        <button disabled={busy} className="mt-6 w-full bg-[var(--charcoal)] px-5 py-3 text-sm text-white disabled:opacity-60">{busy ? "Signing in…" : "Sign in"}</button>
        <a href="/" className="mt-5 block text-center text-sm text-[var(--muted)]">← Back to store</a>
      </form>
    </main>
  );
}
