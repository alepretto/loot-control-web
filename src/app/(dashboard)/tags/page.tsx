"use client";

import { useEffect, useRef, useState } from "react";
import {
  Category, Tag, TagFamily,
  categoriesApi, tagsApi, tagFamiliesApi, CategoryType,
} from "@/lib/api";

// ─── Icons ────────────────────────────────────────────────────────────────────
const PlusIcon = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const ChevronRight = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 18l6-6-6-6" />
  </svg>
);
const ChevronDown = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);
const BackIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M19 12H5M12 5l-7 7 7 7" />
  </svg>
);
const PencilIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
    <path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
  </svg>
);
const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ─── Modal wrapper ─────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-2 border border-border rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
          <button onClick={onClose} className="text-muted hover:text-text-primary transition-colors p-1 rounded-lg hover:bg-surface-3">
            <XIcon />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function TagsPage() {
  const [families, setFamilies] = useState<TagFamily[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [mobilePanel, setMobilePanel] = useState<"families" | "content">("families");

  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Modals
  const [showCreateFamily, setShowCreateFamily] = useState(false);
  const [showCreateCat, setShowCreateCat] = useState(false);
  const [showCreateTag, setShowCreateTag] = useState<string | null>(null); // catId
  const [movingCatId, setMovingCatId] = useState<string | null>(null);

  // Inline rename
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const renameRef = useRef<HTMLInputElement>(null);

  async function load() {
    const [fl, cats, tl] = await Promise.all([
      tagFamiliesApi.list(), categoriesApi.list(), tagsApi.list(),
    ]);
    setFamilies(fl); setCategories(cats); setTags(tl);
  }
  useEffect(() => { load(); }, []);
  useEffect(() => { if (renamingId) renameRef.current?.focus(); }, [renamingId]);

  // Auto-select first family
  useEffect(() => {
    if (families.length > 0 && selectedFamilyId === null) {
      setSelectedFamilyId(families[0].id);
    }
  }, [families, selectedFamilyId]);

  function toggleCat(id: string) {
    setCollapsedCats(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectFamily(id: string | null) {
    setSelectedFamilyId(id);
    setMobilePanel("content");
    setPendingDeleteId(null);
  }

  // ── CRUD ────────────────────────────────────────────────────────────────────
  async function deleteFamily(id: string) {
    if (pendingDeleteId !== id) { setPendingDeleteId(id); return; }
    await tagFamiliesApi.delete(id);
    if (selectedFamilyId === id) setSelectedFamilyId(null);
    setPendingDeleteId(null);
    load();
  }
  async function deleteCategory(id: string) {
    if (pendingDeleteId !== id) { setPendingDeleteId(id); return; }
    await categoriesApi.delete(id);
    setPendingDeleteId(null);
    load();
  }
  async function deleteTag(id: string) {
    if (pendingDeleteId !== id) { setPendingDeleteId(id); return; }
    await tagsApi.delete(id);
    setPendingDeleteId(null);
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

  // Rename flow (works for both tag names and category names via type)
  function startRename(id: string, currentName: string) {
    setRenamingId(id); setRenameValue(currentName); setRenameError(null);
    setPendingDeleteId(null);
  }
  async function commitRename(item: Tag | Category) {
    const name = renameValue.trim();
    if (!name || name === item.name) { setRenamingId(null); return; }
    try {
      if ("type" in item) {
        await tagsApi.update(item.id, { name });
      } else {
        await categoriesApi.update(item.id, { name });
      }
      setRenamingId(null);
      load();
    } catch {
      setRenameError("Já existe um item com esse nome.");
    }
  }

  // ── Data ────────────────────────────────────────────────────────────────────
  const selectedFamily = families.find(f => f.id === selectedFamilyId) ?? null;
  const selectedCats = selectedFamilyId
    ? categories.filter(c => c.family_id === selectedFamilyId)
    : categories.filter(c => !c.family_id);

  // ── Panels ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full overflow-hidden" onClick={() => setPendingDeleteId(null)}>

      {/* ── Left: Families panel ─────────────────────────────────────────── */}
      <aside className={`
        ${mobilePanel === "families" ? "flex" : "hidden"} md:flex
        w-full md:w-56 shrink-0 flex-col border-r border-border bg-surface overflow-hidden
      `}>
        <div className="flex items-center justify-between px-4 py-4 border-b border-border shrink-0">
          <span className="text-xs font-semibold text-muted uppercase tracking-wider">Famílias</span>
          <button
            onClick={(e) => { e.stopPropagation(); setShowCreateFamily(true); }}
            className="w-6 h-6 flex items-center justify-center rounded-md text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
            title="Nova família"
          >
            <PlusIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {families.map(f => {
            const catCount = categories.filter(c => c.family_id === f.id).length;
            const isSelected = selectedFamilyId === f.id;
            const isPendingDelete = pendingDeleteId === f.id;

            return (
              <div
                key={f.id}
                onClick={(e) => { e.stopPropagation(); selectFamily(f.id); }}
                className={`group flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-all duration-150 ${
                  isSelected ? "bg-primary/10 text-primary" : "text-muted hover:bg-surface-2 hover:text-text-primary"
                }`}
              >
                <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${isSelected ? "bg-primary" : "bg-border group-hover:bg-muted"} transition-colors`} />
                <span className="flex-1 text-sm font-medium truncate">{f.name}</span>
                <span className={`text-[10px] font-mono shrink-0 ${isSelected ? "text-primary/70" : "text-muted/60"}`}>{catCount}</span>

                {/* Delete / confirm */}
                <button
                  onClick={(e) => { e.stopPropagation(); deleteFamily(f.id); }}
                  className={`shrink-0 transition-all duration-150 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    isPendingDelete
                      ? "text-danger bg-danger/15 border border-danger/30 opacity-100"
                      : "text-transparent group-hover:text-muted/50 hover:!text-danger opacity-0 group-hover:opacity-100"
                  }`}
                  title="Excluir família"
                >
                  {isPendingDelete ? "Confirmar" : <TrashIcon />}
                </button>
              </div>
            );
          })}

          {families.length === 0 && (
            <p className="text-xs text-muted text-center py-6 px-4">Nenhuma família.<br />Crie uma para começar.</p>
          )}
        </nav>
      </aside>

      {/* ── Right: Content panel ─────────────────────────────────────────── */}
      <main className={`
        ${mobilePanel === "content" ? "flex" : "hidden"} md:flex
        flex-1 flex-col overflow-hidden
      `}>
        {/* Content header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0 bg-surface">
          {/* Mobile back button */}
          <button
            onClick={() => setMobilePanel("families")}
            className="md:hidden flex items-center gap-1.5 text-sm text-muted hover:text-text-primary transition-colors mr-3"
          >
            <BackIcon />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-text-primary truncate">
              {selectedFamily?.name ?? "Sem família"}
            </h1>
            <p className="text-xs text-muted mt-0.5">
              {selectedCats.length} {selectedCats.length === 1 ? "categoria" : "categorias"} ·{" "}
              {selectedCats.reduce((acc, c) => acc + tags.filter(t => t.category_id === c.id).length, 0)} tags
            </p>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); setShowCreateCat(true); }}
            className="flex items-center gap-1.5 text-xs font-medium text-text-primary bg-surface-2 border border-border hover:bg-surface-3 px-3 py-1.5 rounded-lg transition-colors shrink-0"
          >
            <PlusIcon className="w-3 h-3" />
            Categoria
          </button>
        </div>

        {/* Categories list */}
        <div className="flex-1 overflow-y-auto">
          {selectedCats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
              <div className="w-12 h-12 rounded-xl bg-surface-2 border border-border flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6 text-muted">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
                  <circle cx="7" cy="7" r="1" fill="currentColor" stroke="none" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">Nenhuma categoria</p>
                <p className="text-xs text-muted mt-1">Crie uma categoria para adicionar tags.</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setShowCreateCat(true); }}
                className="text-xs text-primary hover:text-primary-hover transition-colors"
              >
                + Nova categoria
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {selectedCats.map(cat => {
                const catTags = tags.filter(t => t.category_id === cat.id);
                const isCollapsed = collapsedCats.has(cat.id);
                const isPendingCatDelete = pendingDeleteId === cat.id;
                const isMovingThis = movingCatId === cat.id;
                const isRenamingCat = renamingId === cat.id;

                return (
                  <div key={cat.id}>
                    {/* Category header */}
                    <div
                      className="flex items-center gap-3 px-5 py-3 bg-surface-2/50 hover:bg-surface-2 transition-colors cursor-pointer group"
                      onClick={(e) => { e.stopPropagation(); toggleCat(cat.id); }}
                    >
                      <span className="text-muted shrink-0 transition-transform duration-200">
                        {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </span>

                      {isRenamingCat ? (
                        <input
                          ref={renameRef}
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter") { e.preventDefault(); commitRename(cat); }
                            if (e.key === "Escape") setRenamingId(null);
                          }}
                          onBlur={() => commitRename(cat)}
                          onClick={e => e.stopPropagation()}
                          className="flex-1 bg-background border border-primary/50 rounded-md px-2 py-0.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                        />
                      ) : (
                        <span className="flex-1 text-sm font-medium text-text-primary truncate">{cat.name}</span>
                      )}

                      {renameError && renamingId === cat.id && (
                        <span className="text-xs text-danger shrink-0">{renameError}</span>
                      )}

                      <span className="text-[10px] font-mono text-muted shrink-0">{catTags.length}</span>

                      {/* Category actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={e => e.stopPropagation()}>
                        {isMovingThis ? (
                          <select
                            autoFocus
                            defaultValue={cat.family_id ?? ""}
                            onChange={e => moveCategory(cat.id, e.target.value || null)}
                            className="text-xs bg-background border border-border rounded px-2 py-1 text-text-primary focus:outline-none focus:border-primary"
                            onClick={e => e.stopPropagation()}
                            onBlur={() => setMovingCatId(null)}
                          >
                            <option value="">Sem família</option>
                            {families.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                          </select>
                        ) : (
                          <button
                            onClick={() => setMovingCatId(cat.id)}
                            className="text-[10px] text-muted hover:text-text-primary px-1.5 py-0.5 rounded hover:bg-surface-3 transition-colors"
                          >
                            Mover
                          </button>
                        )}
                        <button
                          onClick={() => startRename(cat.id, cat.name)}
                          className="p-1.5 rounded hover:bg-surface-3 text-muted hover:text-text-primary transition-colors"
                          title="Renomear"
                        >
                          <PencilIcon />
                        </button>
                        <button
                          onClick={() => deleteCategory(cat.id)}
                          className={`p-1.5 rounded transition-all text-xs font-medium ${
                            isPendingCatDelete
                              ? "bg-danger/15 text-danger border border-danger/30 px-2"
                              : "hover:bg-surface-3 text-muted hover:text-danger"
                          }`}
                          title="Excluir categoria"
                        >
                          {isPendingCatDelete ? "Confirmar?" : <TrashIcon />}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowCreateTag(cat.id); }}
                          className="p-1.5 rounded hover:bg-surface-3 text-muted hover:text-accent transition-colors"
                          title="Nova tag"
                        >
                          <PlusIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Tags list */}
                    {!isCollapsed && (
                      <div>
                        {catTags.map(tag => {
                          const isRenamingTag = renamingId === tag.id;
                          const isPendingTagDelete = pendingDeleteId === tag.id;

                          return (
                            <div
                              key={tag.id}
                              className="group flex items-center gap-3 px-5 py-2.5 hover:bg-surface-2/40 transition-colors border-t border-border/40"
                              onClick={e => e.stopPropagation()}
                            >
                              {/* Type dot */}
                              <span
                                className={`shrink-0 w-2 h-2 rounded-full ${tag.type === "income" ? "bg-accent" : "bg-danger"}`}
                                title={tag.type === "income" ? "Entrada" : "Saída"}
                              />

                              {/* Name (or rename input) */}
                              {isRenamingTag ? (
                                <input
                                  ref={renameRef}
                                  value={renameValue}
                                  onChange={e => { setRenameValue(e.target.value); setRenameError(null); }}
                                  onKeyDown={e => {
                                    if (e.key === "Enter") { e.preventDefault(); commitRename(tag); }
                                    if (e.key === "Escape") setRenamingId(null);
                                  }}
                                  onBlur={() => commitRename(tag)}
                                  className="flex-1 bg-background border border-primary/50 rounded-md px-2 py-0.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                                />
                              ) : (
                                <span className={`flex-1 text-sm truncate ${tag.is_active ? "text-text-primary" : "text-muted line-through"}`}>
                                  {tag.name}
                                </span>
                              )}

                              {renameError && isRenamingTag && (
                                <span className="text-xs text-danger shrink-0">{renameError}</span>
                              )}

                              {/* Badges */}
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${
                                  tag.type === "income"
                                    ? "text-accent bg-accent/8 border-accent/20"
                                    : "text-danger bg-danger/8 border-danger/20"
                                }`}>
                                  {tag.type === "income" ? "Entrada" : "Saída"}
                                </span>
                                {!tag.is_active && (
                                  <span className="text-[10px] text-muted bg-surface-3 border border-border px-1.5 py-0.5 rounded-full">
                                    Inativo
                                  </span>
                                )}
                              </div>

                              {/* Actions (reveal on hover) */}
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <button
                                  onClick={() => toggleTag(tag)}
                                  className={`text-[10px] font-medium px-2 py-1 rounded border transition-all ${
                                    tag.is_active
                                      ? "text-muted border-border hover:text-text-primary hover:border-border/80"
                                      : "text-accent border-accent/30 hover:bg-accent/10"
                                  }`}
                                >
                                  {tag.is_active ? "Desativar" : "Ativar"}
                                </button>
                                <button
                                  onClick={() => startRename(tag.id, tag.name)}
                                  className="p-1.5 rounded hover:bg-surface-3 text-muted hover:text-text-primary transition-colors"
                                  title="Renomear"
                                >
                                  <PencilIcon />
                                </button>
                                <button
                                  onClick={() => deleteTag(tag.id)}
                                  className={`p-1.5 rounded transition-all text-xs font-medium ${
                                    isPendingTagDelete
                                      ? "bg-danger/15 text-danger border border-danger/30 px-2"
                                      : "hover:bg-surface-3 text-muted hover:text-danger"
                                  }`}
                                  title="Excluir tag"
                                >
                                  {isPendingTagDelete ? "Confirmar?" : <TrashIcon />}
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {catTags.length === 0 && (
                          <div className="px-5 py-3 border-t border-border/40 flex items-center gap-2">
                            <p className="text-xs text-muted italic">Nenhuma tag</p>
                            <button
                              onClick={() => setShowCreateTag(cat.id)}
                              className="text-xs text-primary hover:text-primary-hover transition-colors"
                            >
                              + Criar
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      {showCreateFamily && (
        <CreateFamilyModal
          onClose={() => setShowCreateFamily(false)}
          onCreated={() => { setShowCreateFamily(false); load(); }}
        />
      )}
      {showCreateCat && (
        <CreateCategoryModal
          families={families}
          defaultFamilyId={selectedFamilyId ?? ""}
          onClose={() => setShowCreateCat(false)}
          onCreated={() => { setShowCreateCat(false); load(); }}
        />
      )}
      {showCreateTag && (
        <CreateTagModal
          catId={showCreateTag}
          categories={categories}
          onClose={() => setShowCreateTag(null)}
          onCreated={() => { setShowCreateTag(null); load(); }}
        />
      )}
    </div>
  );
}

// ─── Create modals ─────────────────────────────────────────────────────────────
function CreateFamilyModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    await tagFamiliesApi.create({ name: name.trim() });
    onCreated();
  }

  return (
    <Modal title="Nova família" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <ModalField label="Nome">
          <input autoFocus value={name} onChange={e => setName(e.target.value)}
            placeholder="ex: Moradia, Alimentação, Lazer…"
            className={modalInputCls} />
        </ModalField>
        <ModalActions onClose={onClose} loading={loading} label="Criar família" />
      </form>
    </Modal>
  );
}

function CreateCategoryModal({
  families, defaultFamilyId, onClose, onCreated,
}: { families: TagFamily[]; defaultFamilyId: string; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [familyId, setFamilyId] = useState(defaultFamilyId);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    await categoriesApi.create({ name: name.trim(), family_id: familyId || undefined });
    onCreated();
  }

  return (
    <Modal title="Nova categoria" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <ModalField label="Família">
          <select value={familyId} onChange={e => setFamilyId(e.target.value)} className={modalSelectCls}>
            <option value="">Sem família</option>
            {families.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </ModalField>
        <ModalField label="Nome">
          <input autoFocus value={name} onChange={e => setName(e.target.value)}
            placeholder="ex: Aluguel, Mercado, Academia…"
            className={modalInputCls} />
        </ModalField>
        <ModalActions onClose={onClose} loading={loading} label="Criar categoria" />
      </form>
    </Modal>
  );
}

function CreateTagModal({
  catId, categories, onClose, onCreated,
}: { catId: string; categories: Category[]; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<CategoryType>("outcome");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true); setError(null);
    try {
      await tagsApi.create({ name: name.trim(), category_id: catId, type });
      onCreated();
    } catch {
      setError("Já existe uma tag com esse nome nesta categoria.");
      setLoading(false);
    }
  }

  const cat = categories.find(c => c.id === catId);

  return (
    <Modal title={`Nova tag — ${cat?.name ?? ""}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <ModalField label="Tipo">
          <div className="grid grid-cols-2 gap-2">
            {(["outcome", "income"] as CategoryType[]).map(t => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={`py-2.5 rounded-xl text-sm font-semibold border transition-all duration-150 ${
                  type === t
                    ? t === "outcome"
                      ? "bg-danger/15 border-danger/40 text-danger"
                      : "bg-accent/15 border-accent/40 text-accent"
                    : "bg-surface border-border text-muted"
                }`}
              >
                {t === "outcome" ? "Saída" : "Entrada"}
              </button>
            ))}
          </div>
        </ModalField>
        <ModalField label="Nome">
          <input autoFocus value={name} onChange={e => { setName(e.target.value); setError(null); }}
            placeholder="ex: Mensalidade, Feira, Salário…"
            className={modalInputCls} />
          {error && <p className="text-xs text-danger mt-1">{error}</p>}
        </ModalField>
        <ModalActions onClose={onClose} loading={loading} label="Criar tag" />
      </form>
    </Modal>
  );
}

// ─── Modal helpers ─────────────────────────────────────────────────────────────
const modalInputCls =
  "w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm text-text-primary placeholder:text-muted focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-all";
const modalSelectCls =
  "w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-primary/60 transition-all";

function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] text-text-secondary uppercase tracking-wider font-semibold mb-2">{label}</label>
      {children}
    </div>
  );
}

function ModalActions({ onClose, loading, label }: { onClose: () => void; loading: boolean; label: string }) {
  return (
    <div className="flex gap-2 pt-1">
      <button type="button" onClick={onClose}
        className="flex-1 py-2.5 text-sm font-medium text-muted bg-surface border border-border rounded-xl hover:bg-surface-2 hover:text-text-primary transition-colors">
        Cancelar
      </button>
      <button type="submit" disabled={loading}
        className="flex-1 py-2.5 text-sm font-medium text-white bg-primary hover:bg-primary-hover disabled:opacity-50 rounded-xl transition-colors">
        {loading ? "Criando…" : label}
      </button>
    </div>
  );
}
