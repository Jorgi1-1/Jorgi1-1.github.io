import { AtSign, Globe, MessageCircle, Share2 } from "lucide-react";

const COLUMNS = [
  { title: "Producto", links: ["Línea A", "Línea B", "Línea C", "Precios"] },
  { title: "Compañía", links: ["Sobre nosotros", "Carreras", "Prensa"] },
  { title: "Recursos", links: ["Blog", "Guías", "Soporte"] },
  { title: "Legal", links: ["Privacidad", "Términos", "Cookies"] },
];

const SOCIALS = [
  { icon: AtSign, label: "Red social de ejemplo 1" },
  { icon: MessageCircle, label: "Red social de ejemplo 2" },
  { icon: Globe, label: "Red social de ejemplo 3" },
  { icon: Share2, label: "Red social de ejemplo 4" },
];

export function CropwiseFooter() {
  return (
    <footer className="bg-[#1a2413] px-6 py-16 text-[#eae6d9] sm:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-sm font-semibold text-[#eae6d9]">{col.title}</p>
              <ul className="mt-4 flex flex-col gap-3">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-[#eae6d9]/60 transition-colors hover:text-[#eae6d9]"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-6 border-t border-[#eae6d9]/10 pt-8 sm:flex-row">
          <p className="text-xs text-[#eae6d9]/50">
            © {new Date().getFullYear()} Cropwise — sitio de ejemplo con
            contenido genérico. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-4">
            {SOCIALS.map(({ icon: Icon, label }) => (
              <a
                key={label}
                href="#"
                aria-label={label}
                className="text-[#eae6d9]/60 transition-colors hover:text-[#eae6d9]"
              >
                <Icon className="size-5" aria-hidden />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
