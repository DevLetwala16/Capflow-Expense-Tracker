"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Plus, GripVertical, Pencil, Trash2, Check, X } from "lucide-react";
import { db, Category, seedDefaultCategories } from "@/lib/db";
import { DynamicIcon } from "@/components/transaction/DynamicIcon";

const ICON_OPTIONS = [
  "utensils", "home", "plane", "zap", "clapperboard", "shopping-bag",
  "heart-pulse", "banknote", "wallet", "circle-ellipsis", "car", "coffee",
  "gift", "music", "book", "dumbbell", "baby", "pet",
];

const COLOR_OPTIONS = [
  "#F97316", "#6366F1", "#0EA5E9", "#F59E0B", "#EC4899",
  "#8B5CF6", "#10B981", "#EF4444", "#34D399", "#94A3B8",
  "#14B8A6", "#F43F5E", "#84CC16",
];

type CategoryType = "expense" | "income" | "both";

interface EditState {
  name: string;
  icon: string;
  color: string;
  type: CategoryType;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editState, setEditState] = useState<EditState>({ name: "", icon: "utensils", color: "#6366F1", type: "expense" });
  const [newForm, setNewForm] = useState<EditState>({ name: "", icon: "utensils", color: "#6366F1", type: "expense" });
  const [saving, setSaving] = useState(false);
  const [dragSrcIdx, setDragSrcIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    const cats = await db.categories.orderBy("order").toArray();
    setCategories(cats);
    setLoading(false);
  };

  useEffect(() => {
    seedDefaultCategories().then(reload);
  }, []);

  // ── Add category ────────────────────────────────────────────────────────────

  const handleAdd = async () => {
    if (!newForm.name.trim()) return;
    setSaving(true);
    const maxOrder = categories.reduce((m, c) => Math.max(m, c.order), 0);
    await db.categories.add({
      ...newForm,
      name: newForm.name.trim(),
      order: maxOrder + 1,
      isDefault: false,
      createdAt: new Date().toISOString(),
    });
    setNewForm({ name: "", icon: "utensils", color: "#6366F1", type: "expense" });
    setShowAddForm(false);
    setSaving(false);
    await reload();
  };

  // ── Edit category ───────────────────────────────────────────────────────────

  const startEdit = (cat: Category) => {
    setEditingId(cat.id!);
    setEditState({ name: cat.name, icon: cat.icon, color: cat.color, type: cat.type });
  };

  const saveEdit = async () => {
    if (!editingId || !editState.name.trim()) return;
    await db.categories.update(editingId, {
      name: editState.name.trim(),
      icon: editState.icon,
      color: editState.color,
      type: editState.type,
    });
    setEditingId(null);
    await reload();
  };

  // ── Delete ──────────────────────────────────────────────────────────────────

  const handleDelete = async (id: number) => {
    await db.categories.delete(id);
    await reload();
  };

  // ── Drag to reorder ─────────────────────────────────────────────────────────

  const handleDragStart = (idx: number) => setDragSrcIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragSrcIdx === null || dragSrcIdx === idx) return;
    const reordered = [...categories];
    const [moved] = reordered.splice(dragSrcIdx, 1);
    reordered.splice(idx, 0, moved);
    setDragSrcIdx(idx);
    setCategories(reordered);
  };
  const handleDragEnd = async () => {
    setDragSrcIdx(null);
    // Persist new order
    await db.transaction("rw", db.categories, async () => {
      for (let i = 0; i < categories.length; i++) {
        if (categories[i].id) {
          await db.categories.update(categories[i].id!, { order: i + 1 });
        }
      }
    });
  };

  // ── Sub-form renderer ───────────────────────────────────────────────────────

  const renderForm = (
    state: EditState,
    onChange: (patch: Partial<EditState>) => void,
    onSave: () => void,
    onCancel: () => void
  ) => (
    <div className="space-y-4 p-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl mt-2">
      {/* Name */}
      <input
        type="text"
        placeholder="Category name"
        value={state.name}
        onChange={(e) => onChange({ name: e.target.value })}
        className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[#6366F1]"
        autoFocus
      />

      {/* Type */}
      <div>
        <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Type</p>
        <div className="flex gap-2">
          {(["expense", "income", "both"] as const).map((t) => (
            <button
              key={t}
              onClick={() => onChange({ type: t })}
              className={`flex-1 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all border ${
                state.type === t
                  ? "bg-[#6366F1] text-white border-[#6366F1]"
                  : "border-[var(--border-color)] text-[var(--text-secondary)]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Icon */}
      <div>
        <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Icon</p>
        <div className="flex flex-wrap gap-2">
          {ICON_OPTIONS.map((icon) => (
            <button
              key={icon}
              onClick={() => onChange({ icon })}
              className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center transition-all ${
                state.icon === icon
                  ? "border-[#6366F1] bg-[#6366F1]/10"
                  : "border-transparent bg-[var(--bg-card)]"
              }`}
            >
              <DynamicIcon name={icon} size={16} color={state.icon === icon ? "#6366F1" : "var(--text-secondary)"} />
            </button>
          ))}
        </div>
      </div>

      {/* Color */}
      <div>
        <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Color</p>
        <div className="flex flex-wrap gap-2">
          {COLOR_OPTIONS.map((color) => (
            <button
              key={color}
              onClick={() => onChange({ color })}
              className={`w-7 h-7 rounded-full transition-all border-2 ${
                state.color === color ? "scale-110 border-white shadow-lg" : "border-transparent"
              }`}
              style={{ backgroundColor: color }}
              aria-label={color}
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] text-sm font-medium flex items-center justify-center gap-1">
          <X size={14} /> Cancel
        </button>
        <button
          onClick={onSave}
          disabled={saving || !state.name.trim()}
          className="flex-1 py-2.5 rounded-xl bg-[#6366F1] text-white text-sm font-bold flex items-center justify-center gap-1 disabled:opacity-50"
        >
          <Check size={14} /> Save
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-full bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[var(--bg-primary)]/95 backdrop-blur-md border-b border-[var(--border-color)] px-4 py-3">
        <h1 className="text-lg font-bold text-[var(--text-primary)]">Manage Categories</h1>
      </header>

      <div className="px-4 pt-4 pb-8 space-y-3">
        {/* Add new category */}
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-dashed border-[var(--border-color)] text-[#6366F1] font-semibold text-sm hover:bg-[#6366F1]/5 transition-colors"
        >
          <Plus size={16} />
          Add Custom Category
        </button>

        {showAddForm &&
          renderForm(
            newForm,
            (patch) => setNewForm((f) => ({ ...f, ...patch })),
            handleAdd,
            () => setShowAddForm(false)
          )}

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 skeleton rounded-2xl" />)}
          </div>
        ) : (
          categories.map((cat, idx) => (
            <div key={cat.id}>
              <motion.div
                layout
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                className={`bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] px-3 py-3 flex items-center gap-3 cursor-grab active:cursor-grabbing ${
                  dragSrcIdx === idx ? "opacity-50 scale-[0.98]" : ""
                }`}
              >
                {/* Drag handle */}
                <GripVertical size={16} className="text-[var(--text-secondary)] flex-shrink-0" />

                {/* Icon */}
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: cat.color + "20" }}
                >
                  <DynamicIcon name={cat.icon} size={16} color={cat.color} />
                </div>

                {/* Name + type */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{cat.name}</p>
                  <p className="text-xs text-[var(--text-secondary)] capitalize">{cat.type}</p>
                </div>

                {/* Actions */}
                <button
                  onClick={() => startEdit(cat)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-[#6366F1]/10 text-[#6366F1] hover:bg-[#6366F1]/20 transition-colors"
                  aria-label="Edit category"
                >
                  <Pencil size={13} />
                </button>
                {!cat.isDefault && (
                  <button
                    onClick={() => handleDelete(cat.id!)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-[#EF4444]/10 text-[#EF4444] hover:bg-[#EF4444]/20 transition-colors"
                    aria-label="Delete category"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </motion.div>

              {/* Inline edit form */}
              {editingId === cat.id &&
                renderForm(
                  editState,
                  (patch) => setEditState((s) => ({ ...s, ...patch })),
                  saveEdit,
                  () => setEditingId(null)
                )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
