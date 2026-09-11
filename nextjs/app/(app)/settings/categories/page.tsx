"use client";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
export default function CategoriesPage() {
  const router = useRouter();
  return (
    <div className="min-h-full bg-[var(--bg-primary)]">
      <header className="flex items-center gap-3 px-4 py-4 border-b border-[var(--border-color)]">
        <button onClick={() => router.back()}><ArrowLeft size={20} className="text-[var(--text-secondary)]" /></button>
        <h1 className="text-lg font-bold text-[var(--text-primary)]">Manage Categories</h1>
      </header>
      <div className="p-8 text-center text-[var(--text-secondary)] text-sm">Phase 2 feature</div>
    </div>
  );
}
