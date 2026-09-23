import type { ReactNode } from "react";

type RollCTAButtonProps = {
  label: string;
  href?: string;
  containerClassName: string;
  circleClassName: string;
  icon: ReactNode;
  onClick?: () => void;
};

const EASE = "duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)]";

/** Shared by every "text rolls up, circle rotates" CTA in this recreation:
 *  nav, hero, and the about-section button all use this exact pattern. */
export function RollCTAButton({
  label,
  href = "#",
  containerClassName,
  circleClassName,
  icon,
  onClick,
}: RollCTAButtonProps) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={`group inline-flex items-center gap-3 transition-colors ${EASE} ${containerClassName}`}
    >
      <span className="relative h-[20px] overflow-hidden">
        <span
          className={`flex flex-col transition-transform ${EASE} group-hover:-translate-y-1/2`}
        >
          <span className="h-[20px] leading-[20px]">{label}</span>
          <span className="h-[20px] leading-[20px]">{label}</span>
        </span>
      </span>
      <span
        className={`flex shrink-0 items-center justify-center rounded-full transition-transform ${EASE} group-hover:-rotate-45 ${circleClassName}`}
      >
        {icon}
      </span>
    </a>
  );
}
