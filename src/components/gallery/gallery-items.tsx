import type { ReactNode } from "react";

import { CarouselNavigatorDemo } from "@/components/gallery/items/carousel-navigator-demo";
import { ParallaxHeroImagesDemo } from "@/components/gallery/items/parallax-hero-images-demo";
import { TooltipCardDemo } from "@/components/gallery/items/tooltip-card-demo";
import type { GalleryCategory } from "@/components/gallery/gallery-categories";

export type GalleryItem = {
  slug: string;
  title: string;
  description: string;
  category: GalleryCategory;
  source: string;
  preview: ReactNode;
};

export const galleryItems: GalleryItem[] = [
  {
    slug: "tooltip-card",
    title: "Tooltip Card",
    description:
      "Tooltip que sigue al cursor y puede mostrar texto simple o una tarjeta rica (imagen, testimonio).",
    category: "tooltips",
    source: "@aceternity/tooltip-card",
    preview: <TooltipCardDemo />,
  },
  {
    slug: "parallax-hero-images",
    title: "Parallax Hero Images",
    description:
      "Hero con imágenes flotantes a distintas profundidades que reaccionan al movimiento del cursor.",
    category: "heroes",
    source: "@aceternity/parallax-hero-images",
    preview: <ParallaxHeroImagesDemo />,
  },
  {
    slug: "carousel-navigator",
    title: "Carousel Navigator",
    description:
      "Control de carrusel con flechas, indicadores animados y barra de progreso que cambia de tema por slide.",
    category: "carousels",
    source: "https://registry.watermelon.sh/r/carousel-navigator.json",
    preview: <CarouselNavigatorDemo />,
  },
];
