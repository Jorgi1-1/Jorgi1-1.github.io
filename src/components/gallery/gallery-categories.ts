export const GALLERY_CATEGORIES = [
  { value: "cards", label: "Cards" },
  { value: "icons", label: "Iconos" },
  { value: "navbars", label: "Navbars" },
  { value: "tooltips", label: "Tooltips" },
  { value: "buttons", label: "Botones" },
  { value: "forms", label: "Formularios" },
  { value: "heroes", label: "Heroes" },
  { value: "carousels", label: "Carruseles" },
] as const;

export type GalleryCategory = (typeof GALLERY_CATEGORIES)[number]["value"];
