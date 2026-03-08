"use client";

import { useEffect, useState } from "react";
import { Category, Tag, categoriesApi, tagsApi, CategoryType } from "@/lib/api";
import { Button } from "@/components/ui/Button";

export default function TagsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatType, setNewCatType] = useState<CategoryType>("outcome");
  const [newTagCatId, setNewTagCatId] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState("");

  async function load() {
    const [cats, tagList] = await Promise.all([categoriesApi.list(), tagsApi.list()]);
    setCategories(cats);
    setTags(tagList);
  }

  useEffect(() => { load(); }, []);

  async function createCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) return;
    await categoriesApi.create({ name: newCatName.trim(), type: newCatType });
    setNewCatName("");
    setNewCatType("outcome");
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
    await tagsApi.create({ name: newTagName.trim(), category_id: catId });
    setNewTagName("");
    setNewTagCatId(null);
    load();
  }

  async function deleteTag(tag: Tag) {
    if (!confirm(`Excluir tag "${tag.name}"?`)) return;
    await tagsApi.delete(tag.id);
    load();
  }

  async function toggleTag(tag: Tag) {
    await tagsApi.update(tag.id, { is_active: !tag.is_active });
    load();
  }

  const inputCls =
    "flex-1 bg-[#0f1117] border border-[#2d3154] rounded px-2 py-1.5 text-sm text-white placeholder:text-[#6b7280] focus:outline-none focus:border-[#6366f1]";
  const selectCls =
    "bg-[#0f1117] border border-[#2d3154] rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-[#6366f1]";

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Tags & Categorias</h1>
        <Button size="sm" onClick={() => setShowNewCat((v) => !v)}>
          + Nova Categoria
        </Button>
      </div>

      {/* New Category form */}
      {showNewCat && (
        <form
          onSubmit={createCategory}
          className="flex gap-2 items-center bg-[#1a1d2e] border border-[#2d3154] rounded-xl p-3"
        >
          <select
            value={newCatType}
            onChange={(e) => setNewCatType(e.target.value as CategoryType)}
            className={selectCls}
          >
            <option value="outcome">Saída</option>
            <option value="income">Entrada</option>
          </select>
          <input
            autoFocus
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="Nome da categoria"
            className={inputCls}
          />
          <Button type="submit" size="sm">Criar</Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setShowNewCat(false)}>
            Cancelar
          </Button>
        </form>
      )}

      {/* Category cards */}
      <div className="space-y-3">
        {categories.map((cat) => {
          const catTags = tags.filter((t) => t.category_id === cat.id);
          const isAddingTag = newTagCatId === cat.id;

          return (
            <div
              key={cat.id}
              className="bg-[#1a1d2e] border border-[#2d3154] rounded-xl overflow-hidden"
            >
              {/* Category header */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-[#252840] border-b border-[#2d3154]">
                <span
                  className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                    cat.type === "income"
                      ? "bg-[#10b981]/20 text-[#10b981]"
                      : "bg-[#ef4444]/20 text-[#ef4444]"
                  }`}
                >
                  {cat.type === "income" ? "Entrada" : "Saída"}
                </span>
                <span className="text-sm font-medium flex-1">{cat.name}</span>
                <button
                  onClick={() => setNewTagCatId(isAddingTag ? null : cat.id)}
                  className="text-xs text-[#6366f1] hover:text-[#6366f1]/80 transition-colors"
                >
                  + Tag
                </button>
                <button
                  onClick={() => deleteCategory(cat.id)}
                  className="text-xs text-[#6b7280] hover:text-[#ef4444] transition-colors ml-2"
                >
                  Excluir
                </button>
              </div>

              {/* Tags */}
              <div className="divide-y divide-[#2d3154]">
                {catTags.map((tag) => (
                  <div key={tag.id} className="flex items-center justify-between px-4 py-2">
                    <span
                      className={`text-sm ${
                        tag.is_active ? "text-white" : "text-[#6b7280] line-through"
                      }`}
                    >
                      {tag.name}
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleTag(tag)}
                        className={`text-xs transition-colors ${
                          tag.is_active
                            ? "text-[#6b7280] hover:text-[#ef4444]"
                            : "text-[#10b981] hover:text-[#10b981]/80"
                        }`}
                      >
                        {tag.is_active ? "Desativar" : "Ativar"}
                      </button>
                      <button
                        onClick={() => deleteTag(tag)}
                        className="text-xs text-[#6b7280] hover:text-[#ef4444] transition-colors"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}

                {catTags.length === 0 && !isAddingTag && (
                  <p className="px-4 py-3 text-xs text-[#6b7280] italic">Nenhuma tag</p>
                )}

                {/* Inline new tag form */}
                {isAddingTag && (
                  <form
                    onSubmit={(e) => createTag(e, cat.id)}
                    className="flex gap-2 items-center px-4 py-2"
                  >
                    <input
                      autoFocus
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      placeholder="Nome da tag"
                      className={inputCls}
                    />
                    <Button type="submit" size="sm">Criar</Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => { setNewTagCatId(null); setNewTagName(""); }}
                    >
                      ✕
                    </Button>
                  </form>
                )}
              </div>
            </div>
          );
        })}

        {categories.length === 0 && (
          <p className="text-sm text-[#6b7280] text-center py-8">
            Nenhuma categoria. Crie uma para começar.
          </p>
        )}
      </div>
    </div>
  );
}
