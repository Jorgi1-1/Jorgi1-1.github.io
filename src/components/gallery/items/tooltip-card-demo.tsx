"use client";

import { Tooltip } from "@/components/ui/tooltip-card";

export function TooltipCardDemo() {
  return (
    <div className="mx-auto max-w-2xl p-4 md:p-10">
      <div className="text-sm text-neutral-600 dark:text-neutral-400">
        Hubo una interrupción en el servidor. Cuando{" "}
        <Tooltip
          containerClassName="text-neutral-600 dark:text-neutral-400"
          content="AWS se posiciona como “la plataforma cloud más completa y adoptada del mundo”, con más de 200 servicios disponibles globalmente."
        >
          <span className="font-bold">AWS</span>
        </Tooltip>{" "}
        tuvo problemas, migramos rápidamente a un nuevo proveedor. En general
        es un gran servicio, pero a veces no está disponible.
      </div>
      <div className="mt-10 text-sm text-neutral-600 dark:text-neutral-400">
        El servidor lo administraba{" "}
        <Tooltip
          containerClassName="text-neutral-600 dark:text-neutral-400"
          content={<TooltipCardPerson />}
        >
          {" "}
          <span className="cursor-pointer font-bold">Alex Rivera.</span>
        </Tooltip>{" "}
        Alex lleva bastante tiempo en el equipo y es una pieza clave para
        mantener todo funcionando.{" "}
      </div>

      <div className="mt-10 text-sm text-neutral-600 dark:text-neutral-400">
        Por eso le pedimos a Alex un pequeño{" "}
        <Tooltip
          containerClassName="text-neutral-600 dark:text-neutral-400"
          content={<TooltipCardTestimonial />}
        >
          {" "}
          <span className="cursor-pointer font-bold">testimonio.</span>
        </Tooltip>{" "}
        Esto fue lo que compartió sobre trabajar con el equipo.
      </div>
    </div>
  );
}

// A neutral initials avatar, not a photo tied to any real or fictional
// identity — this card exists to demo the Tooltip component, not to imply
// a real person or team.
function TooltipCardAvatar({ className }: { className?: string }) {
  return (
    <div
      className={`flex aspect-square items-center justify-center rounded-sm bg-neutral-200 font-bold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400 ${className ?? ""}`}
      aria-hidden="true"
    >
      AR
    </div>
  );
}

const TooltipCardPerson = () => {
  return (
    <div>
      <TooltipCardAvatar className="w-full text-4xl" />
      <div className="my-4 flex flex-col">
        <p className="text-lg font-bold">Alex Rivera</p>
        <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
          Ingeniero de infraestructura. Le gusta automatizar todo lo que se
          repite dos veces.
        </p>
      </div>
    </div>
  );
};

const TooltipCardTestimonial = () => {
  return (
    <div className="">
      <blockquote className="mb-4 text-neutral-700 dark:text-neutral-300">
        Este componente es justo lo que necesitábamos: simple, flexible y
        fácil de adaptar a nuestro propio contenido.
      </blockquote>
      <div className="flex items-center gap-2">
        <TooltipCardAvatar className="size-6 rounded-full text-[10px]" />
        <div>
          <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
            Alex Rivera
          </p>
          <p className="text-[10px] text-neutral-600 dark:text-neutral-400">
            Ingeniero de infraestructura
          </p>
        </div>
      </div>
    </div>
  );
};
