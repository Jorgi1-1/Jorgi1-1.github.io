import type { ComponentType, ReactNode } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

type BentoCardBaseProps = {
  title: string;
  description?: string;
  icon?: ComponentType<{ className?: string }>;
  className?: string;
  children?: ReactNode;
};

type BentoCardProps =
  | (BentoCardBaseProps & { href: string; comingSoon?: never })
  | (BentoCardBaseProps & { href?: never; comingSoon?: boolean });

const baseClasses =
  "group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-6 min-h-44";

export function BentoCard({
  title,
  description,
  icon: Icon,
  className,
  children,
  ...rest
}: BentoCardProps) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        {Icon ? (
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
            <Icon className="size-5" />
          </div>
        ) : null}
        {"comingSoon" in rest && rest.comingSoon ? (
          <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
            Próximamente
          </span>
        ) : null}
      </div>

      <div className="mt-6 space-y-1.5">
        <h3 className="text-lg font-semibold tracking-tight text-card-foreground">
          {title}
        </h3>
        {description ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>

      {children}
    </>
  );

  if ("href" in rest && rest.href) {
    return (
      <Link
        href={rest.href}
        className={cn(
          baseClasses,
          "transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          className,
        )}
      >
        {content}
      </Link>
    );
  }

  return (
    <div
      aria-disabled="true"
      className={cn(baseClasses, "opacity-70", className)}
    >
      {content}
    </div>
  );
}
