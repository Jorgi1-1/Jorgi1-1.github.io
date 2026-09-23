import Image from "next/image";
import { ArrowRight } from "lucide-react";

import { RollCTAButton } from "./roll-cta-button";

const SMALL_IMAGE =
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260516_090123_74be96d4-9c1b-40cf-932a-96f4f4babed3.png&w=1280&q=85";
const LARGE_IMAGE =
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260516_090133_c157d30b-a99a-4477-bec1-a446149ec3f2.png&w=1280&q=85";

const PARAGRAPH =
  "Through research, creative thinking and iteration we help growing brands realize their digital full potential.";

function AboutCTA({ className = "" }: { className?: string }) {
  return (
    <RollCTAButton
      label="About our studio"
      containerClassName={`bg-[#F26522] hover:bg-[#e05a1a] text-white text-[13px] sm:text-[14px] font-medium rounded-full pl-5 sm:pl-6 pr-2 py-2 w-fit ${className}`}
      circleClassName="size-7 sm:size-8 bg-white text-[#F26522]"
      icon={<ArrowRight className="size-3.5 sm:size-4" aria-hidden />}
    />
  );
}

export function AxionAbout() {
  return (
    <section className="overflow-hidden bg-white pb-12 pt-16 sm:pb-16 sm:pt-20 lg:pb-24 lg:pt-32">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-6 flex items-center gap-3 px-5 sm:mb-8 sm:px-8 lg:px-12">
          <span className="flex size-6 items-center justify-center rounded-full bg-gray-900 text-[11px] font-semibold text-white sm:size-7 sm:text-[12px]">
            1
          </span>
          <span className="rounded-full border border-gray-200 px-3 py-1 text-[12px] font-medium sm:px-4 sm:py-1.5 sm:text-[13px]">
            Introducing Axion
          </span>
        </div>

        <h2
          className="mb-12 px-5 font-medium leading-[1.12] tracking-[-0.02em] text-gray-900 sm:mb-16 sm:px-8 lg:mb-28 lg:px-12"
          style={{ fontSize: "clamp(1.5rem, 4vw, 3.2rem)" }}
        >
          Strategy-led creatives, delivering
          <br />
          results in digital and beyond.
        </h2>

        {/* Mobile / tablet: stacked */}
        <div className="px-5 sm:px-8 lg:hidden">
          <p className="text-[15px] font-medium leading-[1.6] text-gray-900 sm:text-[17px]">
            {PARAGRAPH}
          </p>
          <AboutCTA className="mt-6" />

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:gap-5">
            <div className="relative aspect-[438/346] w-full overflow-hidden rounded-xl sm:w-[45%] sm:rounded-2xl">
              <Image
                src={SMALL_IMAGE}
                alt="Detalle del proceso de diseño de Axion Studio"
                fill
                sizes="(max-width: 640px) 100vw, 45vw"
                className="object-cover"
              />
            </div>
            <div className="relative aspect-[900/600] w-full overflow-hidden rounded-xl sm:w-[55%] sm:rounded-2xl">
              <Image
                src={LARGE_IMAGE}
                alt="Trabajo de marca de Axion Studio"
                fill
                sizes="(max-width: 640px) 100vw, 55vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>

        {/* Desktop: asymmetric grid */}
        <div className="hidden grid-cols-[26%_1fr_48%] items-end gap-6 px-12 lg:grid xl:gap-8">
          <div className="relative aspect-[438/346] w-full self-end overflow-hidden rounded-2xl">
            <Image
              src={SMALL_IMAGE}
              alt="Detalle del proceso de diseño de Axion Studio"
              fill
              sizes="26vw"
              className="object-cover"
            />
          </div>

          <div className="flex flex-col items-end justify-start self-start">
            <p
              className="whitespace-nowrap text-right font-medium leading-[1.65] text-gray-900"
              style={{ fontSize: "clamp(1rem, 1.1vw, 1.125rem)" }}
            >
              Through research, creative thinking
              <br />
              and iteration we help growing brands
              <br />
              realize their digital full potential.
            </p>
            <AboutCTA className="mt-8" />
          </div>

          <div className="relative aspect-[3/2] w-full self-end overflow-hidden rounded-2xl">
            <Image
              src={LARGE_IMAGE}
              alt="Trabajo de marca de Axion Studio"
              fill
              sizes="48vw"
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
