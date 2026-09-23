import "./axion.css";

import { AxionAbout } from "./axion-about";
import { AxionCaseStudies } from "./axion-case-studies";
import { AxionHero } from "./axion-hero";

export function AxionPage() {
  return (
    <>
      <AxionHero />
      <AxionAbout />
      <AxionCaseStudies />
    </>
  );
}
