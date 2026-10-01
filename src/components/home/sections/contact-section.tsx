"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Check, Copy, Mail } from "lucide-react";

import { SITE } from "@/lib/site";

const COPIED_MS = 2000;

type CopyState = "idle" | "copied" | "failed";

export function ContactSection() {
  const [copy, setCopy] = useState<CopyState>("idle");

  useEffect(() => {
    if (copy !== "copied") return;
    const id = window.setTimeout(() => setCopy("idle"), COPIED_MS);
    return () => window.clearTimeout(id);
  }, [copy]);

  // mailto opens whatever mail client the OS has set up, which is often not
  // the one a recruiter uses; copying works everywhere.
  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(SITE.email);
      setCopy("copied");
    } catch {
      // Clipboard can be blocked (permissions, insecure context). Say so, and
      // select the address so a manual copy is one keystroke away.
      setCopy("failed");
      const link = document.querySelector(".section-contact-email-link");
      const selection = window.getSelection();
      if (link && selection) {
        const range = document.createRange();
        range.selectNodeContents(link);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  };

  return (
    <div className="section-contact">
      <p className="section-contact-headline">
        Open to <span className="whitespace-nowrap">full-time</span> roles and freelance projects.
      </p>
      <p className="section-copy">
        If your team or project needs someone who can design it and build it, I&apos;d love to hear about it.
      </p>
      <div className="section-contact-actions">
        <a
          href={SITE.linkedin}
          target="_blank"
          rel="noreferrer"
          className="section-overlay-cta section-contact-cta"
        >
          Message me on LinkedIn
          <ArrowUpRight className="size-5" aria-hidden="true" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
        <span className="section-contact-email">
          <a href={`mailto:${SITE.email}`} className="section-contact-email-link">
            <Mail className="size-4" aria-hidden="true" />
            {SITE.email}
          </a>
          <button
            type="button"
            className="section-contact-copy"
            onClick={copyEmail}
            aria-label={copy === "copied" ? "Email copied" : "Copy email address"}
          >
            {copy === "copied" ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
          </button>
          <span className="sr-only" role="status" aria-live="polite">
            {copy === "copied" ? "Email address copied" : ""}
          </span>
        </span>
        <a href={SITE.github} target="_blank" rel="noreferrer" className="section-contact-email-link section-contact-github">
          GitHub
          <ArrowUpRight className="size-4" aria-hidden="true" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </div>
      {copy === "failed" ? (
        <p className="section-overlay-meta" role="alert">
          Your browser blocked copying. The address is selected, so ⌘C or Ctrl+C will do it.
        </p>
      ) : null}
    </div>
  );
}
