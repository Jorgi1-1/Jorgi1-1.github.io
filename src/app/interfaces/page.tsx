import Link from "next/link";
import {
  ArrowLeft,
  CreditCard,
  GraduationCap,
  Mail,
  Palette,
  ShoppingBag,
  Sparkles,
  Sprout,
  TriangleAlert,
} from "lucide-react";

import { BentoCard } from "@/components/bento-card";

export const metadata = {
  title: "Interfaces — Jorge Tovar",
};

export default function InterfacesPage() {
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
          Interfaces
        </h1>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
          Cada tarjeta es una interfaz recreada. Iremos sumando más con el
          tiempo.
        </p>

        <section
          aria-label="Listado de interfaces"
          className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <BentoCard
            href="/interfaces/velaro"
            icon={ShoppingBag}
            title="VELARO"
            description="Hero de e-commerce de moda, layout asimétrico en naranja."
          />
          <BentoCard
            href="/interfaces/payius"
            icon={CreditCard}
            title="payius"
            description="Hero de SaaS fintech en dark mode con órbitas animadas."
          />
          <BentoCard
            href="/interfaces/vanguard"
            icon={Sparkles}
            title="VANGUARD"
            description="Hero de agencia creativa con video de fondo y menú móvil animado."
          />
          <BentoCard
            href="/interfaces/axion"
            icon={Palette}
            title="Axion Studio"
            description="Landing de agencia de diseño con fondo shader WebGPU animado."
          />
          <BentoCard
            href="/interfaces/tiny-trails"
            icon={TriangleAlert}
            title="TinyTrails 404"
            description="Página de error animada para una marca infantil, sin scroll."
          />
          <BentoCard
            href="/interfaces/codenest"
            icon={GraduationCap}
            title="CodeNest"
            description="Hero dark de plataforma educativa con video HLS y tarjeta de cristal líquido."
          />
          <BentoCard
            href="/interfaces/cropwise"
            icon={Sprout}
            title="Cropwise"
            description="Landing agrícola de una sola página con Lenis, GSAP ScrollTrigger/SplitText y carrusel Splide."
          />
          <BentoCard
            href="/interfaces/aura"
            icon={Mail}
            title="Aura"
            description="Landing de un cliente de email AI-native con video de fondo, menú macOS y vidrio líquido."
          />
          <BentoCard comingSoon title="Próxima interfaz" />
        </section>
      </main>
    </div>
  );
}
