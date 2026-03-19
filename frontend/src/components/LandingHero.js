"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

const VIDEO_SRC = "/videos/baseball-hero.mp4";

function FadeUp({ children, className = "", delay = 0, reducedMotion = false }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reducedMotion ? 0.16 : 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function BrandMark() {
  return (
    <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-sm bg-[#1c2231] shadow-[0_10px_24px_rgba(0,0,0,0.2)]">
      <svg
        viewBox="0 0 44 44"
        aria-hidden="true"
        className="h-full w-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="44" height="44" fill="#1C2231" />
        <path
          d="M9 9H22.5C30.8 9 35 13.1 35 22C35 30.9 30.8 35 22.5 35H9V28.5H15.2V15.5H9V9Z"
          fill="#D8DEE9"
        />
        <path
          d="M22.2 15.2H17.8V28.8H22.2C26.7 28.8 29.2 26.4 29.2 22C29.2 17.6 26.7 15.2 22.2 15.2Z"
          fill="#1C2231"
        />
        <path d="M21.8 9L31.5 9L22.8 19.5H13.2L21.8 9Z" fill="#1C2231" />
      </svg>
    </div>
  );
}

export default function LandingHero() {
  const reducedMotion = useReducedMotion();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07111d] text-white">
      <div className="absolute inset-0">
        <video
          src={VIDEO_SRC}
          className="h-full w-full object-cover object-center opacity-70"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          aria-hidden="true"
        />
      </div>

      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(7,17,29,0.94),rgba(7,17,29,0.76),rgba(7,17,29,0.34))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_16%,rgba(97,210,255,0.18),transparent_28%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_18%,rgba(64,224,183,0.16),transparent_22%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:18px_18px] opacity-[0.18]" />

      <section className="relative z-10 flex min-h-screen w-full flex-col px-5 pb-6 pt-0 sm:px-6 sm:pb-6 lg:px-8 lg:pb-8">
        <FadeUp
          reducedMotion={reducedMotion}
          className="-mx-5 flex w-[calc(100%+2.5rem)] items-center justify-between border-b border-white/10 bg-[linear-gradient(180deg,rgba(16,27,44,0.52),rgba(12,21,36,0.28))] px-8 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.16)] backdrop-blur-xl sm:-mx-6 sm:w-[calc(100%+3rem)] lg:-mx-8 lg:w-[calc(100%+4rem)]"
        >
          <div className="flex items-center gap-4 pl-1">
            <BrandMark />
            <div>
              <p className="text-lg font-semibold tracking-[0.01em] text-white">DraftElite</p>
              <p className="text-xs text-white/55">Fantasy baseball draft assistant</p>
            </div>
          </div>

          <nav className="flex items-center gap-5 text-sm text-white/78">
            <a className="rounded-full px-4 py-2 transition hover:bg-white/10 hover:text-white" href="#about">
              About
            </a>
            <Link
              href="/login"
              className="rounded-full bg-white/10 px-4 py-2 font-medium text-white transition hover:bg-white/16"
            >
              Login
            </Link>
          </nav>
        </FadeUp>

        <div className="mx-auto flex w-full max-w-[1400px] flex-1 items-center py-8 lg:py-10">
          <div className="w-full max-w-[760px] pl-1 sm:pl-2 lg:pl-4">
            <FadeUp
              delay={0.1}
              reducedMotion={reducedMotion}
              className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,20,34,0.8),rgba(8,13,24,0.68))] px-6 py-6 shadow-[0_26px_80px_rgba(0,0,0,0.32)] backdrop-blur-xl sm:px-7 sm:py-7"
            >
              <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-0.04em] text-white sm:text-5xl lg:text-[3.9rem]">
                Win your draft with a board built for every round.
              </h1>

              <p className="mt-5 max-w-3xl text-[15px] leading-8 text-white/82 sm:text-[17px]">
                DraftElite gives fantasy baseball managers one place to set league rules, track
                keeper cost, scan player values, and stay organized when the draft starts moving
                fast.
              </p>

              <ul className="mt-6 space-y-3 text-sm text-white/78">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#54d7b0]" />
                  <span>League-specific draft prep with keeper, main draft, and taxi-round context.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#54d7b0]" />
                  <span>Player API integration for live search, value snapshots, and fast board reads.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#54d7b0]" />
                  <span>Secure account sessions so each league workspace stays private and persistent.</span>
                </li>
              </ul>
            </FadeUp>

            <FadeUp delay={0.18} reducedMotion={reducedMotion} className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-full bg-[#54d7b0] px-5 py-2.5 text-sm font-semibold text-[#07111d] shadow-[0_12px_30px_rgba(84,215,176,0.28)] transition hover:-translate-y-0.5 hover:bg-[#68e4bf]"
              >
                Register
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center rounded-full border border-white/14 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/16"
              >
                Login
              </Link>
            </FadeUp>

            <FadeUp
              delay={0.24}
              reducedMotion={reducedMotion}
              className="mt-7 grid max-w-[720px] gap-3 text-sm text-white/80 md:grid-cols-3"
            >
              <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 backdrop-blur-sm">
                Keeper round tracking
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 backdrop-blur-sm">
                Main draft decision support
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 backdrop-blur-sm">
                Taxi round planning
              </div>
            </FadeUp>
          </div>
        </div>
      </section>
    </main>
  );
}
