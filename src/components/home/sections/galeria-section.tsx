import Link from "next/link";

export function GaleriaSection() {
  return (
    <div className="flex flex-col gap-4">
      <p>
        Cards, iconos, navbars y otros componentes sueltos: piezas de UI que
        voy puliendo por separado.
      </p>
      <Link href="/galeria" className="section-overlay-cta">
        Ver galería
      </Link>
      <span className="section-overlay-meta">/galeria</span>
    </div>
  );
}
