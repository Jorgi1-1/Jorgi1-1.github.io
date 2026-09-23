"use client";

import { useMemo, useState } from "react";

import {
  GALLERY_CATEGORIES,
  type GalleryCategory,
} from "@/components/gallery/gallery-categories";
import type { GalleryItem } from "@/components/gallery/gallery-items";
import { cn } from "@/lib/utils";

type GalleryGridProps = {
  items: GalleryItem[];
};

const ALL_FILTER = "all" as const;

export function GalleryGrid({ items }: GalleryGridProps) {
  const [activeFilter, setActiveFilter] = useState<
    GalleryCategory | typeof ALL_FILTER
  >(ALL_FILTER);

  const availableCategories = useMemo(
    () =>
      GALLERY_CATEGORIES.filter((category) =>
        items.some((item) => item.category === category.value),
      ),
    [items],
  );

  const filteredItems = useMemo(
    () =>
      activeFilter === ALL_FILTER
        ? items
        : items.filter((item) => item.category === activeFilter),
    [items, activeFilter],
  );

  return (
    <div>
      <div
        role="group"
        aria-label="Filtrar por tipo de componente"
        className="flex flex-wrap gap-2"
      >
        <FilterChip
          label="Todos"
          active={activeFilter === ALL_FILTER}
          onClick={() => setActiveFilter(ALL_FILTER)}
        />
        {availableCategories.map((category) => (
          <FilterChip
            key={category.value}
            label={category.label}
            active={activeFilter === category.value}
            onClick={() => setActiveFilter(category.value)}
          />
        ))}
      </div>

      {filteredItems.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">
          Todavía no hay componentes en esta categoría.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {filteredItems.map((item) => {
            const categoryLabel = GALLERY_CATEGORIES.find(
              (category) => category.value === item.category,
            )?.label;

            return (
              <div
                key={item.slug}
                className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
              >
                <div className="overflow-auto bg-muted/40">{item.preview}</div>
                <div className="flex items-start justify-between gap-3 border-t border-border p-4">
                  <div>
                    <h3 className="text-sm font-semibold text-card-foreground">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                  {categoryLabel ? (
                    <span className="shrink-0 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
                      {categoryLabel}
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
