"use client";
import { useState } from "react";
import { Bot, MessageCircle, X, Send } from "lucide-react";
const faqs = [
  [
    "shipping",
    "We offer Standard Delivery and Local Pickup. After your order is placed, the store emails your payment method, any required advance, bank details, and delivery estimate.",
  ],
  [
    "return",
    "Please review the Refund & Return Policy for return eligibility and conditions.",
  ],
  [
    "payment",
    "After a delivery order is placed, the store confirms any required advance and delivery estimate by email. Any advance is credited toward the product total; the remaining balance is due on delivery. Local Pickup requires no advance.",
  ],
  [
    "availability",
    "Each product page shows live stock as AVAILABLE, ONLY X LEFT, or SOLD.",
  ],
  [
    "product",
    "Product pages show material, dimensions, origin, weaving method, images and description.",
  ],
];
function answer(q: string) {
  const x = q.toLowerCase();
  const f = faqs.find(([k]) => x.includes(k));
  return f
    ? f[1]
    : "I can help with shipping, returns, payments, availability and product information. Try asking “How does shipping work?”";
}
export default function ChatBot() {
  const [open, setOpen] = useState(false),
    [q, setQ] = useState(""),
    [m, setM] = useState([
      { u: false, t: "Hi! I’m the Kazim Nawrozi assistant. How can I help?" },
    ]);
  function send() {
    if (!q.trim()) return;
    const t = q.trim();
    setM((v) => [...v, { u: true, t }, { u: false, t: answer(t) }]);
    setQ("");
  }
  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-5 right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-[var(--charcoal)] text-white shadow-xl"
      >
        {open ? <X /> : <MessageCircle />}
      </button>
      {open && (
        <div className="fixed bottom-24 right-5 z-[60] flex w-[min(360px,calc(100vw-2rem))] flex-col overflow-hidden border border-[var(--line)] bg-[var(--paper)] shadow-2xl">
          <div className="flex items-center gap-3 bg-[var(--charcoal)] p-4 text-white">
            <Bot size={20} />
            <div>
              <b>Kazim Nawrozi Assistant</b>
              <div className="text-xs text-white/60">Store help</div>
            </div>
          </div>
          <div className="max-h-80 space-y-3 overflow-y-auto p-4">
            {m.map((x, i) => (
              <div
                key={i}
                className={`max-w-[85%] p-3 text-sm ${x.u ? "ml-auto bg-[var(--ivory)]" : "border border-[var(--line)] bg-white"}`}
              >
                {x.t}
              </div>
            ))}
          </div>
          <div className="border-t p-3">
            <div className="flex gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                className="min-w-0 flex-1 border px-3 py-2 text-sm"
                placeholder="Ask a question…"
              />
              <button
                onClick={send}
                className="bg-[var(--charcoal)] px-3 text-white"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
