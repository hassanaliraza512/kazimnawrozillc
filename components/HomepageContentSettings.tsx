"use client";

import { useEffect, useRef, useState } from "react";
import { Check, LoaderCircle, Save, Upload } from "lucide-react";

type HomepageContent = {
  brandLogo: string;
  brandName: string;
  brandContactEmail: string;
  brandContactPhone: string;
  brandContactAddress: string;
  heroImage: string;
  heroEyebrow: string;
  heroTitle: string;
  heroDescription: string;
  tickerMessages: string[];
  bankName: string;
  bankAccountNumber: string;
  bankBeneficiary: string;
  subscribeEnabled: boolean;
  subscribeHeading: string;
  subscribeDescription: string;
  subscribePlaceholder: string;
  subscribeButtonLabel: string;
  subscribeSuccessMessage: string;
};

const emptyContent: HomepageContent = {
  brandLogo: "/logo.jpg",
  brandName: "Kazim Nawrozi LLC",
  brandContactEmail: "",
  brandContactPhone: "",
  brandContactAddress: "",
  heroImage: "",
  heroEyebrow: "",
  heroTitle: "",
  heroDescription: "",
  tickerMessages: [],
  bankName: "",
  bankAccountNumber: "",
  bankBeneficiary: "",
  subscribeEnabled: true,
  subscribeHeading: "",
  subscribeDescription: "",
  subscribePlaceholder: "",
  subscribeButtonLabel: "",
  subscribeSuccessMessage: "",
};

export default function HomepageContentSettings() {
  const [content, setContent] = useState(emptyContent);
  const [tickerText, setTickerText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const logoFileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/site-content", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load homepage settings.");
        setContent(data);
        setTickerText(data.tickerMessages.join("\n"));
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load homepage settings."))
      .finally(() => setLoading(false));
  }, []);

  function updateField(field: keyof HomepageContent, value: string | boolean) {
    setContent((current) => ({ ...current, [field]: value }));
    setMessage("");
  }

  async function uploadSiteImage(file: File | undefined, field: "heroImage" | "brandLogo") {
    if (!file) return;
    setUploading(true);
    setError("");
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/admin/site-upload", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Image upload failed.");
      updateField(field, data.url);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Image upload failed.");
    } finally {
      setUploading(false);
      if (field === "heroImage" && fileInput.current) fileInput.current.value = "";
      if (field === "brandLogo" && logoFileInput.current) logoFileInput.current.value = "";
    }
  }

  async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/site-content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...content,
          tickerMessages: tickerText.split("\n"),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Settings could not be saved.");
      setContent(data);
      setTickerText(data.tickerMessages.join("\n"));
      setMessage("Homepage content saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Settings could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-8 border border-[var(--line)] bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[.2em] text-[var(--terracotta)]">Homepage</p>
          <h2 className="mt-2 font-serif text-2xl">Brand, homepage, and signup</h2>
        </div>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={loading || uploading}
          className="inline-flex items-center gap-2 border border-[var(--line)] px-4 py-3 text-sm disabled:opacity-50"
        >
          {uploading ? <LoaderCircle size={16} className="animate-spin" /> : <Upload size={16} />}
          Upload hero image
        </button>
        <input
          ref={fileInput}
          hidden
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => uploadSiteImage(event.target.files?.[0], "heroImage")}
        />
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-[var(--muted)]">Loading homepage settings...</p>
      ) : (
        <form onSubmit={saveSettings} className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <div className="space-y-4 border-b border-[var(--line)] pb-5">
              <div>
                <p className="text-xs uppercase tracking-[.2em] text-[var(--terracotta)]">Store identity</p>
                <h3 className="mt-1 font-serif text-xl">Logo and brand name</h3>
              </div>
              <label className="grid gap-2 text-sm">
                <span>Brand name</span>
                <input
                  value={content.brandName}
                  onChange={(event) => updateField("brandName", event.target.value)}
                  maxLength={120}
                  required
                  className="border border-[var(--line)] bg-white px-4 py-3"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span>Logo image URL</span>
                <input
                  value={content.brandLogo}
                  onChange={(event) => updateField("brandLogo", event.target.value)}
                  required
                  className="border border-[var(--line)] bg-white px-4 py-3"
                  placeholder="Upload a logo or paste an HTTPS URL"
                />
              </label>
              <input
                ref={logoFileInput}
                hidden
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => uploadSiteImage(event.target.files?.[0], "brandLogo")}
              />
              <button
                type="button"
                onClick={() => logoFileInput.current?.click()}
                disabled={loading || uploading}
                className="inline-flex items-center gap-2 border border-[var(--line)] px-4 py-3 text-sm disabled:opacity-50"
              >
                {uploading ? <LoaderCircle size={16} className="animate-spin" /> : <Upload size={16} />}
                Upload brand logo
              </button>
              <div className="border-t border-[var(--line)] pt-4">
                <p className="mb-3 text-sm font-medium">Public contact details for approval emails</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm">
                    <span>Contact email</span>
                    <input
                      type="email"
                      value={content.brandContactEmail}
                      onChange={(event) => updateField("brandContactEmail", event.target.value)}
                      maxLength={254}
                      className="border border-[var(--line)] bg-white px-4 py-3"
                    />
                  </label>
                  <label className="grid gap-2 text-sm">
                    <span>Contact phone</span>
                    <input
                      type="tel"
                      value={content.brandContactPhone}
                      onChange={(event) => updateField("brandContactPhone", event.target.value)}
                      maxLength={50}
                      className="border border-[var(--line)] bg-white px-4 py-3"
                    />
                  </label>
                </div>
                <label className="mt-4 grid gap-2 text-sm">
                  <span>Business address</span>
                  <textarea
                    value={content.brandContactAddress}
                    onChange={(event) => updateField("brandContactAddress", event.target.value)}
                    maxLength={240}
                    rows={2}
                    className="border border-[var(--line)] bg-white px-4 py-3"
                  />
                </label>
              </div>
            </div>
            <label className="grid gap-2 text-sm">
              <span>Hero image URL</span>
              <input
                value={content.heroImage}
                onChange={(event) => updateField("heroImage", event.target.value)}
                required
                className="border border-[var(--line)] bg-white px-4 py-3"
                placeholder="Upload an image or paste an HTTPS URL"
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span>Eyebrow</span>
              <input
                value={content.heroEyebrow}
                onChange={(event) => updateField("heroEyebrow", event.target.value)}
                maxLength={120}
                className="border border-[var(--line)] bg-white px-4 py-3"
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span>Main headline</span>
              <input
                value={content.heroTitle}
                onChange={(event) => updateField("heroTitle", event.target.value)}
                maxLength={180}
                required
                className="border border-[var(--line)] bg-white px-4 py-3"
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span>Description</span>
              <textarea
                value={content.heroDescription}
                onChange={(event) => updateField("heroDescription", event.target.value)}
                maxLength={600}
                rows={4}
                className="border border-[var(--line)] bg-white px-4 py-3"
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span>Headline ticker messages</span>
              <textarea
                value={tickerText}
                onChange={(event) => {
                  setTickerText(event.target.value);
                  setMessage("");
                }}
                rows={4}
                className="border border-[var(--line)] bg-white px-4 py-3"
                placeholder="Enter one headline per line"
              />
            </label>
            <div className="space-y-4 border-t border-[var(--line)] pt-5">
              <div>
                <p className="text-xs uppercase tracking-[.2em] text-[var(--terracotta)]">Mailing list</p>
                <h3 className="mt-1 font-serif text-xl">Homepage subscription section</h3>
              </div>
              <label className="flex items-center gap-3 text-sm">
                <span className="relative block h-5 w-5 shrink-0">
                  <input
                    type="checkbox"
                    checked={content.subscribeEnabled}
                    onChange={(event) => updateField("subscribeEnabled", event.target.checked)}
                    className="peer absolute inset-0 z-10 h-5 w-5 cursor-pointer appearance-none border-2 border-[var(--charcoal)] bg-white checked:border-[var(--terracotta)] checked:bg-[var(--terracotta)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terracotta)] focus-visible:ring-offset-2"
                  />
                  <Check
                    size={14}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-[3px] top-[3px] z-20 text-white opacity-0 peer-checked:opacity-100"
                  />
                </span>
                Show subscription section
              </label>
              <label className="grid gap-2 text-sm">
                <span>Section heading</span>
                <input value={content.subscribeHeading} onChange={(event) => updateField("subscribeHeading", event.target.value)} maxLength={180} className="border border-[var(--line)] bg-white px-4 py-3" />
              </label>
              <label className="grid gap-2 text-sm">
                <span>Description</span>
                <textarea value={content.subscribeDescription} onChange={(event) => updateField("subscribeDescription", event.target.value)} maxLength={500} rows={3} className="border border-[var(--line)] bg-white px-4 py-3" />
              </label>
              <label className="grid gap-2 text-sm">
                <span>Email placeholder</span>
                <input value={content.subscribePlaceholder} onChange={(event) => updateField("subscribePlaceholder", event.target.value)} maxLength={80} className="border border-[var(--line)] bg-white px-4 py-3" />
              </label>
              <label className="grid gap-2 text-sm">
                <span>Button label</span>
                <input value={content.subscribeButtonLabel} onChange={(event) => updateField("subscribeButtonLabel", event.target.value)} maxLength={40} className="border border-[var(--line)] bg-white px-4 py-3" />
              </label>
              <label className="grid gap-2 text-sm">
                <span>Confirmation message</span>
                <input value={content.subscribeSuccessMessage} onChange={(event) => updateField("subscribeSuccessMessage", event.target.value)} maxLength={180} className="border border-[var(--line)] bg-white px-4 py-3" />
              </label>
            </div>
            <div className="space-y-4 border-t border-[var(--line)] pt-5">
              <div>
                <p className="text-xs uppercase tracking-[.2em] text-[var(--terracotta)]">Advance payment</p>
                <h3 className="mt-1 font-serif text-xl">Bank transfer details</h3>
              </div>
              <label className="grid gap-2 text-sm">
                <span>Bank name</span>
                <input
                  value={content.bankName}
                  onChange={(event) => updateField("bankName", event.target.value)}
                  maxLength={100}
                  required
                  className="border border-[var(--line)] bg-white px-4 py-3"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span>Account number</span>
                <input
                  value={content.bankAccountNumber}
                  onChange={(event) => updateField("bankAccountNumber", event.target.value)}
                  maxLength={50}
                  required
                  className="border border-[var(--line)] bg-white px-4 py-3"
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span>Beneficiary</span>
                <input
                  value={content.bankBeneficiary}
                  onChange={(event) => updateField("bankBeneficiary", event.target.value)}
                  maxLength={120}
                  required
                  className="border border-[var(--line)] bg-white px-4 py-3"
                />
              </label>
            </div>
            <p className="text-xs text-[var(--muted)]">Up to 8 headlines, 180 characters each. Leave blank to hide the ticker.</p>
            {error && <p role="alert" className="text-sm text-[var(--burgundy)]">{error}</p>}
            {message && <p role="status" className="text-sm text-green-800">{message}</p>}
            <button
              type="submit"
              disabled={saving || uploading}
              className="inline-flex items-center gap-2 bg-[var(--charcoal)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}
              Save homepage content
            </button>
          </div>
          <div>
            <p className="mb-2 text-xs uppercase tracking-wider text-[var(--muted)]">Image preview</p>
            {content.heroImage ? (
              <img src={content.heroImage} alt="Homepage hero preview" className="aspect-[4/3] w-full border border-[var(--line)] object-cover" />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center border border-dashed border-[var(--line)] text-sm text-[var(--muted)]">No hero image selected</div>
            )}
          </div>
        </form>
      )}
    </section>
  );
}