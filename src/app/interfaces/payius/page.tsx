import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ArrowLeft } from "lucide-react";

import { PayiusHero } from "@/components/interfaces/payius/payius-hero";

// Scoped to this route so the rest of the portfolio keeps Geist.
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata = {
  title: "payius — Jorge Tovar",
  description: "Recreación de un hero de landing SaaS fintech.",
};

export default function PayiusPage() {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <div className="mx-auto w-full max-w-[1280px] px-6 pt-8 sm:px-10">
        <Link
          href="/interfaces"
          className="inline-flex items-center gap-2 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <ArrowLeft className="size-4" />
          Volver a interfaces
        </Link>
      </div>

      <div className={`${jakarta.className} mt-8 flex-1`}>
        <PayiusHero />
      </div>
    </div>
  );
}
