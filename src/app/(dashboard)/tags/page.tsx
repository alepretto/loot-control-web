"use client";

import { useEffect, useState } from "react";
import { Category, Tag, categoriesApi, tagsApi, CategoryType } from "@/lib/api";
import { Button } from "@/components/ui/Button";

export default function TagsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [newCatType, setNewCatType] = useState<CategoryType>("outcome");
  const [newTagName, setNewTagName] = useState("");
  const [newTagCatId, setNewTagCatId] = useState("");

  async function load() {
    const [cats, tagList] = await Promise.all([categoriesApi.list(), tagsApi.list()]);
    setCategories(cats);
    setTags(tagList);
    if (cats.length && !newTagCatId) setNewTagCatId(cats[0].id);
  }

  useEffect(() => { load(); }, []);

  async function createCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) return;
    await categoriesApi.create({ name: newCatName.trim(), type: newCatType });
    setNewCatName("");
    load();
  }

  async function createTag(e: React.FormEvent) {
    e.preventDefault();
    if (!newTagName.trim() || !newTagCatId) return;
    await tagsApi.create({ name: newTagName.trim(), category_id: newTagCatId });
    setNewTagName("");
    load();
  }

  async function toggleTag(tag: Tag) {
    await tagsApi.update(tag.id, { is_active: !tag.is_active });
    load();
  }

  const inputCls =
    "flex-1 bg-[#252840] border border-[#2d3154] rounded px-2 py-1.5 text-sm text-[#f1f5f9] placeholder:text-[#6b7280] focus:outline-none focus:border-indigo-500";
  const selectCls =
    "bg-[#252840] border border-[#2d3154] rounded px-2 py-1.5 text-sm text-[#f1f5f9] focus:outline-none focus:border-indigo-500";

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <h1 className="text-lg font-semibold">Tags & Categorias</h1>

      {/* Add Category */}
      <section className="bg-[#1a1d2e] border border-[#2d3154] rounded-xl p-4">
        <h2 className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider mb-3">
          Nova Categoria
        </h2>
        <form onSubmit={createCategory} className="flex gap-2 items-center">
          <select
            value={newCatType}
            onChange={(e) => setNewCatType(e.target.value as CategoryType)}
            className={selectCls}
          >
            <option value="outcome">Saída</option>
            <option value="income">Entrada</option>
          </select>
          <input
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="Nome da categoria"
            className={inputCls}
          />
          <Button type="submit" size="sm">
            Criar
          </Button>
        </form>
      </section>

      {/* Add Tag */}
      <section className="bg-[#1a1d2e] border border-[#2d3154] rounded-xl p-4">
        <h2 className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider mb-3">
          Nova Tag
        </h2>
        <form onSubmit={createTag} className="flex gap-2 items-center">
          <select
            value={newTagCatId}
            onChange={(e) => setNewTagCatId(e.target.value)}
            className={selectCls}
          >
            <option value="">Categoria</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                [{c.type === "income" ? "+" : "-"}] {c.name}
              </option>
            ))}
          </select>
          <input
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="Nome da tag"
            className={inputCls}
          />
          <Button type="submit" size="sm">
            Criar
          </Button>
        </form>
      </section>

      {/* Category + Tag list */}
      <div className="space-y-4">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="bg-[#1a1d2e] border border-[#2d3154] rounded-xl overflow-hidden"
          >
            <div className="flex items-center gap-2 px-4 py-2 bg-[#252840] border-b border-[#2d3154]">
              <span
                className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                  cat.type === "income"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-red-500/20 text-red-400"
                }`}
              >
                {cat.type === "income" ? "Entrada" : "Saída"}
              </span>
              <span className="text-sm font-medium">{cat.name}</span>
            </div>
            <div className="divide-y divide-[#2d3154]">
              {tags
                .filter((t) => t.category_id === cat.id)
                .map((tag) => (
                  <div key={tag.id} className="flex items-center justify-between px-4 py-2">
                    <span
                      className={`text-sm ${
                        tag.is_active ? "text-[#f1f5f9]" : "text-[#6b7280] line-through"
                      }`}
                    >
                      {tag.name}
                    </span>
                    <button
                      onClick={() => toggleTag(tag)}
                      className={`text-xs transition-colors ${
                        tag.is_active
                          ? "text-[#6b7280] hover:text-red-400"
                          : "text-emerald-400 hover:text-emerald-300"
                      }`}
                    >
                      {tag.is_active ? "Desativar" : "Ativar"}
                    </button>
                  </div>
                ))}
              {tags.filter((t) => t.category_id === cat.id).length === 0 && (
                <p className="px-4 py-3 text-xs text-[#6b7280] italic">Nenhuma tag</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
