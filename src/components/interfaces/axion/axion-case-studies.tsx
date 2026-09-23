import type { ReactNode } from "react";
import { ArrowRight, Link as LinkIcon } from "lucide-react";

const NARRATIV_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260516_122702_390f5305-8719-41d5-ae80-d23ab3796c28.mp4";
const LUMINAR_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260516_123323_f909c2b8-ff6c-4edf-882b-8ebcdbe389b5.mp4";

export function AxionCaseStudies() {
  return (
    <section className="bg-[#F5F5F5] pb-16 pt-16 sm:pb-20 sm:pt-20 lg:pb-28 lg:pt-28">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-6 flex items-center gap-3 px-5 sm:mb-8 sm:px-8 lg:px-12">
          <span className="flex size-6 items-center justify-center rounded-full bg-gray-900 text-[11px] font-semibold text-white sm:size-7 sm:text-[12px]">
            2
          </span>
          <span className="rounded-full border border-gray-300 px-3 py-1 text-[12px] font-medium sm:px-4 sm:py-1.5 sm:text-[13px]">
            Featured client work
          </span>
        </div>

        <h2
          className="mb-10 px-5 font-medium leading-[1.08] tracking-[-0.03em] text-gray-900 sm:mb-14 sm:px-8 lg:mb-16 lg:px-12"
          style={{ fontSize: "clamp(1.75rem, 7vw, 4.2rem)" }}
        >
          Our projects
        </h2>

        <div className="grid grid-cols-1 gap-5 px-5 sm:gap-6 sm:px-8 md:grid-cols-2 lg:gap-7 lg:px-12">
          <CaseStudyCard
            video={NARRATIV_VIDEO}
            aspect="aspect-[329/246]"
            bg="bg-[#1a1d2e]"
            description="Winner of Site of the Month 2025 — an interactive 3D showcase driving record engagement"
            title="Narrativ"
            button={<ExpandButton variant="light" label="Learn more" />}
          />

          <CaseStudyCard
            video={LUMINAR_VIDEO}
            aspect="aspect-square"
            bg="bg-[#6b6b6b]"
            description="Transforming a dated platform into a conversion-focused brand experience"
            title="Luminar"
            button={<ExpandButton variant="dark" label="View case study" />}
          />
        </div>
      </div>
    </section>
  );
}

function CaseStudyCard({
  video,
  aspect,
  bg,
  description,
  title,
  button,
}: {
  video: string;
  aspect: string;
  bg: string;
  description: string;
  title: string;
  button: ReactNode;
}) {
  return (
    <div>
      <div
        className={`group relative ${aspect} cursor-pointer overflow-hidden rounded-2xl ${bg}`}
      >
        <video
          src={video}
          autoPlay
          muted
          loop
          playsInline
          className="size-full object-cover"
        />
        <div className="absolute bottom-4 left-4">{button}</div>
      </div>

      <p className="mt-4 text-[13px] leading-relaxed text-gray-600 sm:text-[14px]">
        {description}
      </p>
      <p className="mt-1 text-[14px] font-semibold text-gray-900 sm:text-[15px]">
        {title}
      </p>
    </div>
  );
}

function ExpandButton({
  variant,
  label,
}: {
  variant: "light" | "dark";
  label: string;
}) {
  const isDark = variant === "dark";

  return (
    <div
      className={`flex h-9 w-9 items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-full transition-all duration-300 ease-in-out ${
        isDark ? "bg-gray-900 group-hover:w-[168px]" : "bg-white group-hover:w-[148px]"
      }`}
    >
      <span
        className={`text-[13px] font-medium opacity-0 transition-opacity delay-100 duration-300 group-hover:opacity-100 ${
          isDark ? "text-white" : "text-gray-900"
        }`}
      >
        {label}
      </span>

      {isDark ? (
        <ArrowRight
          className="size-3.5 shrink-0 -rotate-45 text-white transition-transform duration-300 group-hover:rotate-0"
          aria-hidden
        />
      ) : (
        <LinkIcon
          className="size-3.5 shrink-0 -rotate-45 text-gray-900 transition-transform duration-300 group-hover:rotate-0"
          aria-hidden
        />
      )}
    </div>
  );
}
