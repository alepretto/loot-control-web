"use client";

import { useState, useEffect } from "react";
import {
  tagFamiliesApi,
  categoriesApi,
  tagsApi,
  TagFamily,
  Category,
  Tag,
  CategoryType,
} from "@/lib/api";

type OpenForm = "family" | "category" | "tag" | null;

export default function MiniTagsPage() {
  const [families, setFamilies] = useState<TagFamily[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [openForm, setOpenForm] = useState<OpenForm>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newFamilyName, setNewFamilyName] = useState("");
  const [newCatFamilyId, setNewCatFamilyId] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [newTagCatId, setNewTagCatId] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [newTagType, setNewTagType] = useState<CategoryType>("outcome");

  async function load() {
    setLoading(true);
    const [fams, cats, tagList] = await Promise.all([
      tagFamiliesApi.list(),
      categoriesApi.list(),
      tagsApi.list(),
    ]);
    setFamilies(fams);
    setCategories(cats);
    setTags(tagList);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function openFormFor(f: OpenForm) {
    setOpenForm(openForm === f ? null : f);
    setError(null);
  }

  async function createFamily() {
    if (!newFamilyName.trim()) return;
    setSaving(true); setError(null);
    try {
      await tagFamiliesApi.create({ name: newFamilyName.trim() });
      setNewFamilyName(""); setOpenForm(null);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao criar família");
    } finally { setSaving(false); }
  }

  async function createCategory() {
    if (!newCatName.trim() || !newCatFamilyId) return;
    setSaving(true); setError(null);
    try {
      await categoriesApi.create({ name: newCatName.trim(), family_id: newCatFamilyId });
      setNewCatName(""); setNewCatFamilyId(""); setOpenForm(null);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao criar categoria");
    } finally { setSaving(false); }
  }

  async function createTag() {
    if (!newTagName.trim() || !newTagCatId) return;
    setSaving(true); setError(null);
    try {
      await tagsApi.create({ name: newTagName.trim(), category_id: newTagCatId, type: newTagType });
      setNewTagName(""); setNewTagCatId(""); setOpenForm(null);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao criar tag");
    } finally { setSaving(false); }
  }

  async function toggleActive(tag: Tag) {
    await tagsApi.update(tag.id, { is_active: !tag.is_active });
    await load();
  }

  const btnBase = "flex-1 py-3 rounded-2xl text-sm font-medium transition-colors";

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      {/* Header */}
      <h1 className="text-lg font-bold text-text-primary">Tags</h1>

      {/* Quick create buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => openFormFor("family")}
          className={`${btnBase} border ${openForm === "family" ? "bg-primary/10 border-primary/40 text-primary" : "bg-surface border-border text-text-secondary hover:bg-surface-2"}`}
        >
          + Família
        </button>
        <button
          onClick={() => openFormFor("category")}
          className={`${btnBase} border ${openForm === "category" ? "bg-primary/10 border-primary/40 text-primary" : "bg-surface border-border text-text-secondary hover:bg-surface-2"}`}
        >
          + Categoria
        </button>
        <button
          onClick={() => openFormFor("tag")}
          className={`${btnBase} border ${openForm === "tag" ? "bg-primary/10 border-primary/40 text-primary" : "bg-surface border-border text-text-secondary hover:bg-surface-2"}`}
        >
          + Tag
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 bg-danger/10 border border-danger/20 rounded-2xl text-sm text-danger">
          {error}
        </div>
      )}

      {/* Create Family */}
      {openForm === "family" && (
        <div className="bg-surface border border-border rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-text-primary">Nova Família</p>
          <input
            autoFocus
            value={newFamilyName}
            onChange={(e) => setNewFamilyName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createFamily()}
            placeholder="Ex: Moradia, Lazer, Estudos…"
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-primary"
          />
          <div className="flex gap-2">
            <button onClick={() => setOpenForm(null)} className="flex-1 py-3 bg-surface-2 border border-border rounded-xl text-sm text-muted">Cancelar</button>
            <button onClick={createFamily} disabled={saving || !newFamilyName.trim()} className="flex-1 py-3 bg-primary text-white rounded-xl text-sm font-semibold disabled:opacity-40">Criar</button>
          </div>
        </div>
      )}

      {/* Create Category */}
      {openForm === "category" && (
        <div className="bg-surface border border-border rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-text-primary">Nova Categoria</p>
          <select
            value={newCatFamilyId}
            onChange={(e) => setNewCatFamilyId(e.target.value)}
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-primary"
          >
            <option value="">Selecione a família</option>
            {families.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <input
            autoFocus
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createCategory()}
            placeholder="Nome da categoria"
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-primary"
          />
          <div className="flex gap-2">
            <button onClick={() => setOpenForm(null)} className="flex-1 py-3 bg-surface-2 border border-border rounded-xl text-sm text-muted">Cancelar</button>
            <button onClick={createCategory} disabled={saving || !newCatName.trim() || !newCatFamilyId} className="flex-1 py-3 bg-primary text-white rounded-xl text-sm font-semibold disabled:opacity-40">Criar</button>
          </div>
        </div>
      )}

      {/* Create Tag */}
      {openForm === "tag" && (
        <div className="bg-surface border border-border rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-text-primary">Nova Tag</p>
          <select
            value={newTagCatId}
            onChange={(e) => setNewTagCatId(e.target.value)}
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-primary"
          >
            <option value="">Selecione a categoria</option>
            {families.map((f) => (
              <optgroup key={f.id} label={f.name}>
                {categories.filter((c) => c.family_id === f.id).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <input
            autoFocus
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createTag()}
            placeholder="Nome da tag"
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-primary"
          />
          {/* Type toggle */}
          <div className="flex rounded-xl overflow-hidden border border-border">
            {(["outcome", "income"] as CategoryType[]).map((t) => (
              <button
                key={t}
                onClick={() => setNewTagType(t)}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  newTagType === t
                    ? t === "outcome" ? "bg-danger/20 text-danger" : "bg-accent/20 text-accent"
                    : "bg-surface text-muted"
                }`}
              >
                {t === "outcome" ? "Saída" : "Entrada"}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setOpenForm(null)} className="flex-1 py-3 bg-surface-2 border border-border rounded-xl text-sm text-muted">Cancelar</button>
            <button onClick={createTag} disabled={saving || !newTagName.trim() || !newTagCatId} className="flex-1 py-3 bg-primary text-white rounded-xl text-sm font-semibold disabled:opacity-40">Criar</button>
          </div>
        </div>
      )}

      {/* Tree */}
      {loading ? (
        <p className="text-muted text-sm text-center py-8">Carregando...</p>
      ) : families.length === 0 ? (
        <p className="text-muted text-sm text-center py-8">Nenhuma família criada ainda.</p>
      ) : (
        <div className="space-y-2">
          {families.map((family) => {
            const famCats = categories.filter((c) => c.family_id === family.id);
            const isOpen = expanded.has(family.id);
            const tagCount = famCats.reduce((s, c) => s + tags.filter((t) => t.category_id === c.id).length, 0);
            return (
              <div key={family.id} className="bg-surface border border-border rounded-2xl overflow-hidden">
                <button
                  onClick={() => toggle(family.id)}
                  className="w-full flex items-center justify-between px-4 py-4 hover:bg-surface-2 transition-colors"
                >
                  <span className="text-sm font-semibold text-text-primary">{family.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted">{tagCount} tags</span>
                    <span className="text-xs text-muted">{isOpen ? "▲" : "▼"}</span>
                  </div>
                </button>

                {isOpen && famCats.map((cat) => {
                  const catTags = tags.filter((t) => t.category_id === cat.id);
                  const isCatOpen = expanded.has(cat.id);
                  return (
                    <div key={cat.id} className="border-t border-border">
                      <button
                        onClick={() => toggle(cat.id)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-surface-2 hover:bg-surface-3 transition-colors"
                      >
                        <span className="text-sm text-text-secondary">{cat.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted">{catTags.length}</span>
                          <span className="text-xs text-muted">{isCatOpen ? "▲" : "▼"}</span>
                        </div>
                      </button>

                      {isCatOpen && (
                        <div className="divide-y divide-border">
                          {catTags.length === 0 ? (
                            <p className="px-4 py-3 text-xs text-muted">Nenhuma tag.</p>
                          ) : catTags.map((tag) => (
                            <div key={tag.id} className="flex items-center justify-between px-4 py-3 min-h-[48px]">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${tag.type === "income" ? "bg-accent" : "bg-danger"}`} />
                                <span className={`text-sm truncate ${tag.is_active ? "text-text-primary" : "text-muted line-through"}`}>
                                  {tag.name}
                                </span>
                              </div>
                              <button
                                onClick={() => toggleActive(tag)}
                                className={`text-xs px-3 py-1.5 rounded-full border flex-shrink-0 ml-2 transition-colors ${
                                  tag.is_active
                                    ? "border-border text-muted hover:border-danger/40 hover:text-danger"
                                    : "border-accent/30 text-accent bg-accent/10"
                                }`}
                              >
                                {tag.is_active ? "Ativa" : "Inativa"}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {isOpen && famCats.length === 0 && (
                  <div className="border-t border-border px-4 py-3">
                    <p className="text-xs text-muted">Nenhuma categoria nesta família.</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
