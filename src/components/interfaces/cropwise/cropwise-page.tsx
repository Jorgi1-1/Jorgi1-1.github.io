"use client";

import { useEffect, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";

import { CropwiseNavbar } from "./navbar";
import { CropwiseHero } from "./hero";
import { PartnersStrip } from "./partners-strip";
import { ProblemSection } from "./problem-section";
import { CanvasSequenceSection } from "./canvas-sequence-section";
import { IllustrationFillSection } from "./illustration-fill-section";
import { LocationsSection } from "./locations-section";
import { UpdateCrossfadeSection } from "./update-crossfade-section";
import { CarouselSection } from "./carousel-section";
import { ApplyModal } from "./apply-modal";
import { CropwiseFooter } from "./footer";

import "./cropwise.css";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText);
}

export function CropwisePage() {
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });

    // Drive Lenis off gsap's own ticker (instead of its default internal
    // rAF loop) so its scroll updates and ScrollTrigger's recalculations
    // land on the same frame — otherwise pinned/scrubbed sections judder.
    const update = (time: number) => lenis.raf(time * 1000);
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(update);
      lenis.destroy();
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  return (
    <div className="bg-[#eae6d9]">
      <CropwiseNavbar onApplyClick={() => setModalOpen(true)} />
      <CropwiseHero />
      <PartnersStrip />
      <ProblemSection />
      <CanvasSequenceSection />
      <IllustrationFillSection />
      <LocationsSection />
      <UpdateCrossfadeSection />
      <CarouselSection />
      <CropwiseFooter />
      <ApplyModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
