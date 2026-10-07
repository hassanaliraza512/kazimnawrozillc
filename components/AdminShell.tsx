"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  ExternalLink,
  FileText,
  LayoutDashboard,
  LogOut,
  Mails,
  Package,
  Settings,
  Store,
  Trash2,
  Truck,
  Users,
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";

const items = [
  ["/admin", "Overview", LayoutDashboard, null],
  ["/admin/products", "Storefront", Store, "store"],
  ["/admin/inventory", "Inventory", Boxes, "inventory"],
  ["/admin/orders", "Orders", Package, "orders"],
  ["/admin/trash", "Trash", Trash2, "orders"],
  ["/admin/analytics", "Analytics", BarChart3, "analytics"],
  ["/admin/settings", "Settings", Settings, "settings"],
  ["/admin/categories", "Categories", Boxes, "categories"],
  ["/admin/users", "Admin Users", Users, "users"],
  ["/admin/notifications", "Notifications", Mails, "orders"],
] as const;

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const path = usePathname();
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    fetch("/api/admin/me")
      .then((response) => (response.ok ? response.json() : null))
      .then(setSession);
  }, []);

  useEffect(() => {
    if (!session) return;
    const match = items.find(
      ([href]) => path === href || path.startsWith(`${href}/`),
    );
    if (
      match &&
      match[3] &&
      session.role !== "admin" &&
      !session.permissions.includes(match[3])
    ) {
      const first = items.find(
        ([, , , permission]) =>
          !permission || session.permissions.includes(permission),
      );
      window.location.href = first?.[0] || "/admin";
    }
  }, [session, path]);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  const allowed = (permission: string | null) =>
    !permission ||
    session?.role === "admin" ||
    session?.permissions?.includes(permission);
  const current = items.find(
    ([href]) => path === href || path.startsWith(`${href}/`),
  );

  return (
    <div className="admin-shell min-h-screen">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <BrandLogo
            href="/admin"
            compact
            showName
            className="admin-brand-link"
            imageClassName="admin-brand-image"
          />
          <span className="admin-brand-label">STORE ADMIN</span>
        </div>

        <nav className="admin-navigation" aria-label="Store management">
          <p className="admin-nav-heading">Workspace</p>
          {items
            .filter(([, , , permission]) => allowed(permission))
            .map(([href, label, Icon]) => {
              const active =
                href === "/admin"
                  ? path === "/admin"
                  : path.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className="admin-nav-link"
                >
                  <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                  <span>{label}</span>
                </Link>
              );
            })}

          <p className="admin-nav-heading admin-nav-secondary-heading">
            Store links
          </p>
          {allowed("delivery") && (
            <Link href="/shipping" className="admin-nav-link">
              <Truck size={18} strokeWidth={1.8} aria-hidden="true" />
              <span>Delivery methods</span>
            </Link>
          )}
          {allowed("policies") && (
            <Link href="/refund-policy" className="admin-nav-link">
              <FileText size={18} strokeWidth={1.8} aria-hidden="true" />
              <span>Store policies</span>
            </Link>
          )}
          <Link href="/" className="admin-nav-link">
            <ExternalLink size={18} strokeWidth={1.8} aria-hidden="true" />
            <span>Public storefront</span>
          </Link>
        </nav>

        <div className="admin-account">
          <span className="admin-account-avatar" aria-hidden="true">
            {(session?.username || "A").slice(0, 1).toUpperCase()}
          </span>
          <span className="admin-account-details">
            <strong>{session?.username || "Administrator"}</strong>
            <span>
              {session?.role === "admin" ? "Store administrator" : "Staff"}
            </span>
          </span>
          <button
            type="button"
            onClick={logout}
            className="admin-logout"
            aria-label="Log out"
            title="Log out"
          >
            <LogOut size={17} aria-hidden="true" />
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div>
            <p className="admin-topbar-eyebrow">Kazim Nawrozi LLC</p>
            <h1>{current?.[1] || "Store management"}</h1>
          </div>
          <Link href="/" className="admin-view-store">
            <Store size={16} aria-hidden="true" />
            <span>View store</span>
            <ExternalLink size={14} aria-hidden="true" />
          </Link>
        </header>
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
