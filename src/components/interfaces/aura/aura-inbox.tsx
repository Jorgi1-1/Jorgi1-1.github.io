"use client";

import { motion } from "motion/react";
import {
  Archive,
  ChevronDown,
  FileText,
  Inbox as InboxIcon,
  MoreHorizontal,
  Paperclip,
  Reply,
  Search,
  Send,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";

const NAV_ITEMS = [
  { icon: InboxIcon, label: "Inbox", count: 12, active: true },
  { icon: Star, label: "Starred", count: 3 },
  { icon: Send, label: "Sent" },
  { icon: FileText, label: "Drafts", count: 2 },
  { icon: Archive, label: "Archive" },
  { icon: Trash2, label: "Trash" },
];

const LABELS = [
  { name: "Work", color: "#00d2ff" },
  { name: "Personal", color: "#A4F4FD" },
  { name: "Travel", color: "#f59e0b" },
  { name: "Finance", color: "#10b981" },
];

const MESSAGES = [
  {
    name: "Linear",
    subject: "Weekly product digest",
    preview: "Your team shipped 23 issues this week...",
    time: "9:41 AM",
    unread: true,
    active: true,
  },
  {
    name: "Sophia Chen",
    subject: "Re: Q3 roadmap review",
    preview: "Thanks for sending the deck over. I had a few thoughts...",
    time: "8:12 AM",
    unread: true,
  },
  {
    name: "Figma",
    subject: "Marcus commented on your file",
    preview: "Love the new direction on the landing hero.",
    time: "Yesterday",
  },
  {
    name: "Stripe",
    subject: "Payout of $12,480.00 sent",
    preview: "Your payout is on its way to your bank...",
    time: "Yesterday",
  },
  {
    name: "Vercel",
    subject: "Deployment ready for aura-web",
    preview: "Preview is live at aura-web-g3f.vercel.app",
    time: "Mon",
  },
  {
    name: "GitHub",
    subject: "[aura/core] PR #482 approved",
    preview: "david-lim approved your pull request.",
    time: "Mon",
  },
];

export function AuraInbox() {
  return (
    <section className="relative z-10 max-w-6xl mx-auto px-6 py-16 md:py-24">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 1.1, ease: [0.22, 1, 0.36, 1] }}
        className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#0e1014]/90 backdrop-blur-2xl"
      >
        <div className="h-10 flex items-center px-4 border-b border-white/10 bg-black/20 relative">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <span className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <span className="absolute left-1/2 -translate-x-1/2 text-xs text-white/50">
            Aura — Inbox
          </span>
        </div>

        <div className="grid grid-cols-12 h-[520px]">
          {/* Sidebar */}
          <div className="col-span-3 border-r border-white/10 bg-black/30 p-4 flex flex-col">
            <button
              type="button"
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-white text-black text-xs font-semibold px-3 py-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Compose with Aura
            </button>

            <nav className="mt-6 flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <div
                  key={item.label}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs ${
                    item.active
                      ? "bg-white/10 text-white"
                      : "text-white/60 hover:bg-white/5"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <item.icon className="w-3.5 h-3.5" />
                    {item.label}
                  </span>
                  {item.count && (
                    <span className="text-white/40">{item.count}</span>
                  )}
                </div>
              ))}
            </nav>

            <div className="mt-6">
              <span className="text-[10px] uppercase tracking-widest text-white/40">
                Labels
              </span>
              <div className="mt-3 flex flex-col gap-2">
                {LABELS.map((label) => (
                  <div
                    key={label.name}
                    className="flex items-center gap-2 px-2.5 text-xs text-white/60"
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: label.color }}
                    />
                    {label.name}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Message list */}
          <div className="col-span-4 border-r border-white/10 flex flex-col">
            <div className="h-12 flex items-center gap-2 px-4 border-b border-white/10 text-white/40 text-xs">
              <Search className="w-3.5 h-3.5" />
              Search mail
            </div>
            <div className="flex-1 overflow-hidden">
              {MESSAGES.map((message) => (
                <div
                  key={message.subject}
                  className={`px-4 py-3 border-b border-white/5 ${
                    message.active ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs ${
                        message.unread
                          ? "font-semibold text-white"
                          : "text-white/70"
                      }`}
                    >
                      {message.name}
                    </span>
                    <span className="text-[10px] text-white/40">
                      {message.time}
                    </span>
                  </div>
                  <p
                    className={`mt-1 text-xs ${
                      message.unread ? "text-white/90" : "text-white/60"
                    }`}
                  >
                    {message.subject}
                  </p>
                  <p className="mt-0.5 text-[11px] text-white/40 truncate">
                    {message.preview}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Reader */}
          <div className="col-span-5 flex flex-col">
            <div className="h-12 flex items-center justify-between px-4 border-b border-white/10">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="w-7 h-7 rounded-md hover:bg-white/5 flex items-center justify-center"
                >
                  <Reply className="w-3.5 h-3.5 text-white/60" />
                </button>
                <button
                  type="button"
                  className="w-7 h-7 rounded-md hover:bg-white/5 flex items-center justify-center"
                >
                  <ChevronDown className="w-3.5 h-3.5 text-white/60 rotate-180" />
                </button>
                <button
                  type="button"
                  className="w-7 h-7 rounded-md hover:bg-white/5 flex items-center justify-center"
                >
                  <Archive className="w-3.5 h-3.5 text-white/60" />
                </button>
                <button
                  type="button"
                  className="w-7 h-7 rounded-md hover:bg-white/5 flex items-center justify-center"
                >
                  <Trash2 className="w-3.5 h-3.5 text-white/60" />
                </button>
              </div>
              <button
                type="button"
                className="w-7 h-7 rounded-md hover:bg-white/5 flex items-center justify-center"
              >
                <MoreHorizontal className="w-3.5 h-3.5 text-white/60" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <h3 className="text-sm font-semibold text-white">
                Weekly product digest
              </h3>
              <div className="mt-3 flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#00d2ff] to-[#0B2551] flex items-center justify-center text-[11px] font-semibold text-white">
                  L
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-xs text-white/90">Linear</span>
                  <span className="text-[10px] text-white/40">
                    to me · 9:41 AM
                  </span>
                </div>
                <span className="ml-auto px-2 py-0.5 rounded-full border border-white/10 text-[10px] text-white/50">
                  Work
                </span>
              </div>

              <div className="mt-5 aura-liquid-glass rounded-lg p-3">
                <div className="flex items-center gap-2 text-xs font-medium">
                  <Sparkles className="w-3.5 h-3.5" style={{ color: "#A4F4FD" }} />
                  Summary by Aura
                </div>
                <p className="mt-2 text-xs text-white/60 leading-relaxed">
                  Your team closed 23 issues, merged 14 PRs, and shipped 2
                  features. Top contributor: Marcus. No action needed.
                </p>
              </div>

              <div className="mt-5 space-y-3 text-xs text-white/70 leading-relaxed">
                <p>Hi team,</p>
                <p>
                  Here is your weekly digest of everything happening across
                  your projects. This was a strong week with significant
                  progress on the Q3 roadmap.
                </p>
                <p>
                  Twenty-three issues were closed, fourteen pull requests were
                  merged, and two customer-facing features went out. The
                  velocity trend continues to climb.
                </p>
                <p>
                  Let me know if you would like a deeper breakdown by project
                  or contributor.
                </p>
                <p className="text-white/50">— The Linear team</p>
              </div>

              <div className="mt-5 inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-xs text-white/60">
                <Paperclip className="w-3.5 h-3.5" />
                digest-may-6.pdf
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
