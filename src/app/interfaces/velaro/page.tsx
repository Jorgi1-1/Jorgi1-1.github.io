import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { VelaroHero } from "@/components/interfaces/velaro/velaro-hero";

export const metadata = {
  title: "VELARO — Jorge Tovar",
  description: "Recreación de un hero de e-commerce de moda.",
};

export default function VelaroPage() {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <div className="mx-auto w-full max-w-[1400px] px-6 pt-8 sm:px-10">
        <Link
          href="/interfaces"
          className="inline-flex items-center gap-2 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <ArrowLeft className="size-4" />
          Volver a interfaces
        </Link>
      </div>

      <div className="mt-8 flex-1">
        <VelaroHero />
      </div>
    </div>
  );
}
