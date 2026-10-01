"use client";

import { FormEvent, useState } from "react";

type SubscribeFormProps = {
  placeholder: string;
  buttonLabel: string;
  successMessage: string;
};

export default function SubscribeForm({
  placeholder,
  buttonLabel,
  successMessage,
}: SubscribeFormProps) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Subscription could not be completed.");
      setSubmitted(true);
      setMessage(data.status === "approved" ? "This email is already subscribed." : successMessage);
      setEmail("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Subscription could not be completed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="relative mx-auto mt-8 flex w-full max-w-xl flex-col items-stretch gap-3 sm:flex-row">
      <input
        className="min-h-12 min-w-0 flex-1 border border-white/80 bg-[var(--paper)] px-4 text-[var(--charcoal)] placeholder:text-[var(--muted)] focus-visible:ring-2 focus-visible:ring-[var(--terracotta)] disabled:opacity-70"
        placeholder={placeholder}
        type="email"
        autoComplete="email"
        required
        value={email}
        disabled={submitting || submitted}
        onChange={(event) => setEmail(event.target.value)}
        aria-label={placeholder}
      />
      <button
        type="submit"
        disabled={submitting || submitted}
        className="min-h-12 shrink-0 bg-white px-7 text-sm font-semibold text-[var(--charcoal)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Submitting..." : submitted ? "Subscribed" : buttonLabel}
      </button>
      {message && <p className="basis-full text-sm text-white/85" role="status">{message}</p>}
    </form>
  );
}