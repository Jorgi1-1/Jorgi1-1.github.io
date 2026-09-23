import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { GalleryGrid } from "@/components/gallery/gallery-grid";
import { galleryItems } from "@/components/gallery/gallery-items";

export const metadata = {
  title: "Galería — Jorge Tovar",
};

export default function GaleriaPage() {
  return (
    <div className="flex flex-1 justify-center bg-background">
      <main className="w-full max-w-5xl px-6 py-16 sm:px-10">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md"
        >
          <ArrowLeft className="size-4" />
          Volver al menú
        </Link>

        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Galería
        </h1>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
          Componentes y elementos visuales sueltos: cards, iconos, navbars y
          más. Filtra por tipo para encontrar lo que buscas.
        </p>

        <div className="mt-10">
          <GalleryGrid items={galleryItems} />
        </div>
      </main>
    </div>
  );
}
