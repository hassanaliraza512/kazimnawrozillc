"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import {
  AdminListControls,
  useAdminList,
} from "@/components/AdminListControls";
import { Edit3, Plus, Save, Trash2, X } from "lucide-react";

type Category = {
  id: number;
  name: string;
  slug: string;
  description: string;
  sort_order: number;
  active: number;
};

const emptyCategory = { name: "", slug: "", description: "", sort_order: 0 };

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<any>(emptyCategory);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const list = useAdminList(
    categories,
    (category) =>
      `${category.name} ${category.slug} ${category.description}`,
  );

  async function load() {
    const response = await fetch("/api/categories", { cache: "no-store" });
    setCategories(await response.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await response.json();
    setMessage(response.ok ? "Category saved." : data.error || "Save failed.");
    if (response.ok) {
      setForm(emptyCategory);
      setEditing(false);
      load();
    }
  }

  async function remove(id: number) {
    if (
      !confirm(
        "Delete this category? Products using it must be moved first.",
      )
    )
      return;
    const response = await fetch(`/api/categories/${id}`, {
      method: "DELETE",
    });
    const data = await response.json();
    setMessage(
      response.ok ? "Category deleted." : data.error || "Delete failed.",
    );
    if (response.ok) load();
  }

  return (
    <AdminShell>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[.25em] text-[var(--terracotta)]">
            Catalog structure
          </p>
          <h1 className="mt-2 text-4xl">Categories</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            One category table drives product records, shop filters, product
            pages and admin.
          </p>
        </div>
        <button
          onClick={() => {
            setForm(emptyCategory);
            setEditing(true);
          }}
          className="inline-flex items-center gap-2 bg-[var(--charcoal)] px-4 py-3 text-sm text-white"
        >
          <Plus size={16} /> Add category
        </button>
      </div>
      {message && (
        <div className="mt-5 bg-[var(--ivory)] p-4 text-sm">{message}</div>
      )}
      {editing && (
        <form
          onSubmit={save}
          className="mt-7 border border-[var(--line)] bg-[var(--ivory)] p-6"
        >
          <div className="flex justify-between">
            <h2 className="font-serif text-2xl">
              {form.id ? "Edit category" : "Add category"}
            </h2>
            <button type="button" onClick={() => setEditing(false)}>
              <X />
            </button>
          </div>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <label className="text-sm">
              Name
              <input
                required
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                className="mt-2 w-full border p-3"
              />
            </label>
            <label className="text-sm">
              Slug
              <input
                required
                value={form.slug}
                onChange={(event) =>
                  setForm({ ...form, slug: event.target.value })
                }
                className="mt-2 w-full border p-3"
              />
            </label>
            <label className="text-sm md:col-span-2">
              Description
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                className="mt-2 w-full border p-3"
                rows={4}
              />
            </label>
          </div>
          <button className="mt-5 inline-flex items-center gap-2 bg-[var(--charcoal)] px-5 py-3 text-sm text-white">
            <Save size={16} /> Save category
          </button>
        </form>
      )}
      <div className="mt-7">
        <AdminListControls
          search={list.search}
          onSearchChange={list.setSearch}
          totalCount={list.filteredItems.length}
          currentPage={list.currentPage}
          pageCount={list.pageCount}
          onPageChange={list.setCurrentPage}
          placeholder="Search categories by name, slug, or description"
        />
      </div>
      <div className="mt-4 overflow-x-auto border border-[var(--line)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--ivory)]">
            <tr>
              <th className="p-4">Name</th>
              <th className="p-4">Slug</th>
              <th className="p-4">Description</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {list.visibleItems.map((category) => (
              <tr
                className="border-t border-[var(--line)]"
                key={category.id}
              >
                <td className="p-4 font-semibold">{category.name}</td>
                <td className="p-4">{category.slug}</td>
                <td className="p-4 text-[var(--muted)]">
                  {category.description}
                </td>
                <td className="p-4">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setForm(category);
                        setEditing(true);
                      }}
                      className="border px-3 py-2"
                      aria-label={`Edit ${category.name}`}
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      onClick={() => remove(category.id)}
                      className="border px-3 py-2"
                      aria-label={`Delete ${category.name}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!list.visibleItems.length && (
              <tr>
                <td
                  colSpan={4}
                  className="p-8 text-center text-sm text-[var(--muted)]"
                >
                  {categories.length
                    ? "No categories match your search."
                    : "No categories found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
