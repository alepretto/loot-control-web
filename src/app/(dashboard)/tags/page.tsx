"use client";

import { useEffect, useState } from "react";
import {
  Category,
  Tag,
  TagFamily,
  categoriesApi,
  tagsApi,
  tagFamiliesApi,
  CategoryType,
} from "@/lib/api";
import { Button } from "@/components/ui/Button";

export default function TagsPage() {
  const [families, setFamilies] = useState<TagFamily[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  // Family form
  const [showNewFamily, setShowNewFamily] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState("");

  // Category form
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatFamilyId, setNewCatFamilyId] = useState<string>("");

  // Tag form
  const [newTagCatId, setNewTagCatId] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState("");
  const [newTagType, setNewTagType] = useState<CategoryType>("outcome");
  const [tagError, setTagError] = useState<string | null>(null);

  // Category family editing
  const [movingCatId, setMovingCatId] = useState<string | null>(null);

  // Tag editing panel
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState("");
  const [editingTagCatId, setEditingTagCatId] = useState<string>("");

  // Collapsed state: Set of IDs that are collapsed
  const [collapsedFamilies, setCollapsedFamilies] = useState<Set<string>>(new Set());
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  function toggleFamily(id: string) {
    setCollapsedFamilies((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleCategory(id: string) {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function load() {
    const [familyList, cats, tagList] = await Promise.all([
      tagFamiliesApi.list(),
      categoriesApi.list(),
      tagsApi.list(),
    ]);
    setFamilies(familyList);
    setCategories(cats);
    setTags(tagList);
  }

  useEffect(() => { load(); }, []);

  async function createFamily(e: React.FormEvent) {
    e.preventDefault();
    if (!newFamilyName.trim()) return;
    await tagFamiliesApi.create({ name: newFamilyName.trim() });
    setNewFamilyName("");
    setShowNewFamily(false);
    load();
  }

  async function deleteFamily(id: string) {
    if (!confirm("Excluir família? As categorias vinculadas ficarão sem família.")) return;
    await tagFamiliesApi.delete(id);
    load();
  }

  async function createCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) return;
    await categoriesApi.create({
      name: newCatName.trim(),
      family_id: newCatFamilyId || undefined,
    });
    setNewCatName("");
    setNewCatFamilyId("");
    setShowNewCat(false);
    load();
  }

  async function deleteCategory(id: string) {
    if (!confirm("Excluir categoria e todas as suas tags?")) return;
    await categoriesApi.delete(id);
    load();
  }

  async function createTag(e: React.FormEvent, catId: string) {
    e.preventDefault();
    if (!newTagName.trim()) return;
    setTagError(null);
    try {
      await tagsApi.create({ name: newTagName.trim(), category_id: catId, type: newTagType });
      setNewTagName("");
      setNewTagType("outcome");
      setNewTagCatId(null);
      load();
    } catch (err: unknown) {
      setTagError(err instanceof Error ? err.message : "Erro ao criar tag");
    }
  }

  async function deleteTag(tag: Tag) {
    if (!confirm(`Excluir tag "${tag.name}"?`)) return;
    await tagsApi.delete(tag.id);
    load();
  }

  function openEditTag(tag: Tag) {
    setEditingTagId(tag.id);
    setEditingTagName(tag.name);
    setEditingTagCatId(tag.category_id);
  }

  function closeEditTag() {
    setEditingTagId(null);
  }

  async function saveTag(tag: Tag) {
    const name = editingTagName.trim();
    if (!name) return;
    const patch: Partial<{ name: string; is_active: boolean; category_id: string }> = {};
    if (name !== tag.name) patch.name = name;
    if (editingTagCatId !== tag.category_id) patch.category_id = editingTagCatId;
    if (Object.keys(patch).length > 0) await tagsApi.update(tag.id, patch);
    closeEditTag();
    load();
  }

  async function toggleTag(tag: Tag) {
    await tagsApi.update(tag.id, { is_active: !tag.is_active });
    load();
  }

  async function moveCategory(catId: string, familyId: string | null) {
    await categoriesApi.update(catId, { family_id: familyId ?? undefined });
    setMovingCatId(null);
    load();
  }

  const inputCls =
    "flex-1 bg-background border border-border rounded px-2 py-1.5 text-sm text-text-primary placeholder:text-muted focus:outline-none";
  const selectCls =
    "bg-background border border-border rounded px-2 py-1.5 text-sm text-text-primary focus:outline-none";

  const familyGroups: { family: TagFamily | null; cats: Category[] }[] = [
    ...families.map((f) => ({
      family: f,
      cats: categories.filter((c) => c.family_id === f.id),
    })),
    {
      family: null,
      cats: categories.filter((c) => !c.family_id),
    },
  ].filter((g) => g.family !== null || g.cats.length > 0);

  function renderCategoryCard(cat: Category) {
    const catTags = tags.filter((t) => t.category_id === cat.id);
    const isAddingTag = newTagCatId === cat.id;
    const isMoving = movingCatId === cat.id;
    const isCatCollapsed = collapsedCategories.has(cat.id);

    return (
      <div key={cat.id} className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-surface-2 border-b border-border">
          <button
            onClick={() => toggleCategory(cat.id)}
            className="text-muted hover:text-text-primary transition-colors text-xs w-4 text-left"
          >
            {isCatCollapsed ? "▶" : "▼"}
          </button>
          <span className="text-sm font-medium flex-1">{cat.name}</span>
          {isCatCollapsed && (
            <span className="text-xs text-muted">{catTags.length} tag{catTags.length !== 1 ? "s" : ""}</span>
          )}
          {isMoving ? (
            <>
              <select
                autoFocus
                defaultValue={cat.family_id ?? ""}
                onChange={(e) => moveCategory(cat.id, e.target.value || null)}
                className={selectCls + " text-xs"}
              >
                <option value="">Sem família</option>
                {families.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              <button
                onClick={() => setMovingCatId(null)}
                className="text-xs text-muted hover:text-text-primary transition-colors"
              >
                ✕
              </button>
            </>
          ) : (
            <button
              onClick={() => setMovingCatId(cat.id)}
              className="text-xs text-muted hover:text-text-primary transition-colors"
            >
              Mover
            </button>
          )}
          <button
            onClick={() => {
              setTagError(null);
              setNewTagCatId(isAddingTag ? null : cat.id);
              setNewTagName("");
              setNewTagType("outcome");
            }}
            className="text-xs text-accent hover:text-accent/80 transition-colors"
          >
            + Tag
          </button>
          <button
            onClick={() => deleteCategory(cat.id)}
            className="text-xs text-muted hover:text-danger transition-colors ml-2"
          >
            Excluir
          </button>
        </div>

        {!isCatCollapsed && <div className="divide-y divide-border">
          {catTags.map((tag) => {
            const isEditingThis = editingTagId === tag.id;
            return (
            <div key={tag.id} className="flex flex-col group">
              {/* Row */}
              <div className="flex items-center justify-between px-4 py-2 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`shrink-0 w-2 h-2 rounded-full ${
                      tag.type === "income" ? "bg-accent" : "bg-danger"
                    }`}
                    title={tag.type === "income" ? "Entrada" : "Saída"}
                  />
                  <span className={`text-sm ${tag.is_active ? "text-text-primary" : "text-muted line-through"}`}>
                    {tag.name}
                  </span>
                  {!tag.is_active && (
                    <span className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-surface-3 text-muted">
                      Inativo
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => isEditingThis ? closeEditTag() : openEditTag(tag)}
                    className={`text-xs transition-colors ${isEditingThis ? "text-primary" : "text-muted hover:text-text-primary"}`}
                  >
                    {isEditingThis ? "Fechar" : "Editar"}
                  </button>
                  <button
                    onClick={() => deleteTag(tag)}
                    className="text-xs text-muted hover:text-danger transition-colors opacity-0 group-hover:opacity-100"
                  >
                    Excluir
                  </button>
                </div>
              </div>
              {/* Edit panel */}
              {isEditingThis && (
                <div className="px-4 pb-3 pt-1 bg-surface-2 flex flex-col gap-2">
                  <div className="flex gap-2 items-center">
                    <label className="text-xs text-muted w-16 shrink-0">Nome</label>
                    <input
                      autoFocus
                      value={editingTagName}
                      onChange={(e) => setEditingTagName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Escape") closeEditTag(); }}
                      className={inputCls}
                    />
                  </div>
                  <div className="flex gap-2 items-center">
                    <label className="text-xs text-muted w-16 shrink-0">Categoria</label>
                    <select
                      value={editingTagCatId}
                      onChange={(e) => setEditingTagCatId(e.target.value)}
                      className={selectCls + " flex-1"}
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2 items-center justify-between">
                    <button
                      onClick={() => toggleTag(tag)}
                      className={`text-xs px-2 py-1 rounded border transition-colors ${
                        tag.is_active
                          ? "border-danger/40 text-danger hover:bg-danger/10"
                          : "border-accent/40 text-accent hover:bg-accent/10"
                      }`}
                    >
                      {tag.is_active ? "Desativar" : "Ativar"}
                    </button>
                    <div className="flex gap-2">
                      <Button type="button" size="sm" variant="ghost" onClick={closeEditTag}>Cancelar</Button>
                      <Button type="button" size="sm" onClick={() => saveTag(tag)}>Salvar</Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            );
          })}

          {catTags.length === 0 && !isAddingTag && (
            <p className="px-4 py-3 text-xs text-muted italic">Nenhuma tag</p>
          )}

          {isAddingTag && (
            <form
              onSubmit={(e) => createTag(e, cat.id)}
              className="flex flex-col gap-1 px-4 py-2"
            >
              <div className="flex gap-2 items-center">
                <select
                  value={newTagType}
                  onChange={(e) => setNewTagType(e.target.value as CategoryType)}
                  className={selectCls}
                >
                  <option value="outcome">Saída</option>
                  <option value="income">Entrada</option>
                </select>
                <input
                  autoFocus
                  value={newTagName}
                  onChange={(e) => { setNewTagName(e.target.value); setTagError(null); }}
                  placeholder="Nome da tag"
                  className={inputCls}
                />
                <Button type="submit" size="sm">Criar</Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setNewTagCatId(null); setNewTagName(""); setTagError(null); }}
                >
                  ✕
                </Button>
              </div>
              {tagError && <p className="text-xs text-danger">{tagError}</p>}
            </form>
          )}
        </div>}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Tags & Categorias</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setShowNewFamily((v) => !v)}>
            + Nova Família
          </Button>
          <Button size="sm" onClick={() => setShowNewCat((v) => !v)}>
            + Nova Categoria
          </Button>
        </div>
      </div>

      {showNewFamily && (
        <form onSubmit={createFamily} className="flex gap-2 items-center bg-surface border border-border rounded-xl p-3">
          <input autoFocus value={newFamilyName} onChange={(e) => setNewFamilyName(e.target.value)}
            placeholder="Nome da família (ex: Gastos de Casa)" className={inputCls} />
          <Button type="submit" size="sm">Criar</Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setShowNewFamily(false)}>Cancelar</Button>
        </form>
      )}

      {showNewCat && (
        <form onSubmit={createCategory} className="flex gap-2 items-center bg-surface border border-border rounded-xl p-3">
          <select value={newCatFamilyId} onChange={(e) => setNewCatFamilyId(e.target.value)} className={selectCls}>
            <option value="">Sem família</option>
            {families.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <input autoFocus value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
            placeholder="Nome da categoria" className={inputCls} />
          <Button type="submit" size="sm">Criar</Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setShowNewCat(false)}>Cancelar</Button>
        </form>
      )}

      <div className="space-y-6">
        {familyGroups.map(({ family, cats }) => {
          const familyKey = family?.id ?? "__none__";
          const isFamilyCollapsed = collapsedFamilies.has(familyKey);
          return (
          <div key={familyKey}>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1 bg-border" />
              <button
                onClick={() => toggleFamily(familyKey)}
                className="flex items-center gap-1.5 text-xs font-semibold text-muted uppercase tracking-wider px-2 hover:text-text-primary transition-colors"
              >
                <span>{isFamilyCollapsed ? "▶" : "▼"}</span>
                <span>{family?.name ?? "Sem Família"}</span>
                {isFamilyCollapsed && (
                  <span className="normal-case font-normal">({cats.length})</span>
                )}
              </button>
              {family && (
                <button onClick={() => deleteFamily(family.id)}
                  className="text-xs text-muted hover:text-danger transition-colors">
                  Excluir família
                </button>
              )}
              <div className="h-px flex-1 bg-border" />
            </div>
            {!isFamilyCollapsed && (
              <div className="space-y-3">
                {cats.map((cat) => renderCategoryCard(cat))}
                {cats.length === 0 && (
                  <p className="text-xs text-muted italic text-center py-2">Nenhuma categoria nesta família</p>
                )}
              </div>
            )}
          </div>
          );
        })}
        {familyGroups.length === 0 && (
          <p className="text-sm text-muted text-center py-8">Nenhuma categoria. Crie uma família e uma categoria para começar.</p>
        )}
      </div>
    </div>
  );
}
