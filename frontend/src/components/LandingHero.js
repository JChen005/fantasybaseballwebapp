"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

const VIDEO_SRC = "/videos/baseball-hero.mp4";

function BlurIn({
  delay = 0,
  className = "",
  children,
  reducedMotion = false,
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={
        reducedMotion
          ? { opacity: 0 }
          : { opacity: 0, filter: "blur(10px)", y: 20 }
      }
      animate={
        reducedMotion
          ? { opacity: 1 }
          : { opacity: 1, filter: "blur(0px)", y: 0 }
      }
      transition={
        reducedMotion
          ? { duration: 0.2, delay }
          : { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }
      }
    >
      {children}
    </motion.div>
  );
}

function SplitText({
  text,
  className = "",
  delay = 0,
  inline = false,
  reducedMotion = false,
}) {
  const words = text.split(" ");

  return (
    <span className={className}>
      {words.map((word, index) => (
        <motion.span
          key={`${word}_${index}`}
          className={inline ? "inline-block" : "inline-block"}
          initial={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: reducedMotion ? 0.01 : 0.6,
            delay: delay + index * 0.08,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {word}
          {index < words.length - 1 ? "\u00A0" : ""}
        </motion.span>
      ))}
    </span>
  );
}

// AI
export default function LandingHero() {
  const reducedMotion = useReducedMotion();

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-[#070612] text-white">
      <div className="absolute inset-0 z-0 overflow-hidden">
        <video
          src={VIDEO_SRC}
          className="h-full w-full object-cover object-center scale-[1.1] md:scale-[1.14] lg:scale-[1.18]"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          aria-hidden="true"
        />
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 h-40 bg-gradient-to-t from-[#070612] to-transparent" />
      <div className="absolute inset-0 z-10 bg-[linear-gradient(to_right,rgba(7,6,18,0.94),rgba(7,6,18,0.7),rgba(7,6,18,0.36))]" />
      <div className="absolute inset-0 z-10 bg-[radial-gradient(circle_at_72%_15%,rgba(47,191,157,0.18),transparent_42%)]" />

      <section className="relative z-20 flex min-h-screen w-full items-center py-10 sm:py-14">
        <div className="mx-auto w-full max-w-7xl px-6 lg:px-12">
          <div className="max-w-3xl space-y-10">
            <div className="rounded-2xl border border-white/15 bg-[#070612]/40 p-5 shadow-[0_24px_80px_rgba(7,6,18,0.55)] backdrop-blur-md sm:p-7 lg:p-8">
              <BlurIn
                delay={0}
                reducedMotion={reducedMotion}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white/80 backdrop-blur-sm"
              >
                <Sparkles className="h-3 w-3 text-white/80" />
                <span>New Fantasy Draft Assistant</span>
              </BlurIn>

              <div className="mt-6 space-y-6">
                <h1 className="text-4xl font-medium leading-tight text-white md:text-5xl lg:text-6xl lg:leading-[1.2]">
                  <span className="block">
                    <SplitText
                      text="Win Your Fantasy Draft"
                      delay={0.08}
                      reducedMotion={reducedMotion}
                    />
                  </span>
                  <span className="inline">
                    <SplitText
                      text="for Every"
                      delay={0.32}
                      inline
                      reducedMotion={reducedMotion}
                    />
                  </span>{" "}
                  <span className="inline font-serif italic">
                    <SplitText
                      text="Round."
                      delay={0.48}
                      inline
                      reducedMotion={reducedMotion}
                    />
                  </span>
                </h1>

                <BlurIn
                  delay={0.4}
                  reducedMotion={reducedMotion}
                  className="max-w-2xl text-lg leading-relaxed font-normal text-white/85"
                >
                  DraftKit helps you configure your league, track keepers, run
                  the main draft, manage taxi picks, and make stronger picks in
                  real time.
                </BlurIn>

                <BlurIn
                  delay={0.52}
                  reducedMotion={reducedMotion}
                  className="max-w-2xl"
                >
                  <ul className="space-y-2 text-sm text-white/80">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#2fbf9d]" />
                      <span>Auth with bcrypt plus JWT cookie sessions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#2fbf9d]" />
                      <span>
                        League config, keeper/main/taxi rounds, and player-level
                        notes
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#2fbf9d]" />
                      <span>
                        Live player search and valuation suggestions during your
                        draft
                      </span>
                    </li>
                  </ul>
                </BlurIn>
              </div>
            </div>

            <BlurIn
              delay={0.6}
              reducedMotion={reducedMotion}
              className="flex flex-wrap gap-4"
            >
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-full bg-[#2fbf9d] px-6 py-3 font-semibold text-[#070612] shadow-[0_10px_28px_rgba(47,191,157,0.35)] transition-all hover:-translate-y-0.5 hover:bg-[#45d6b3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2fbf9d] focus-visible:ring-offset-2 focus-visible:ring-offset-[#070612]"
              >
                Register
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center rounded-full bg-white/20 px-8 py-3 font-semibold text-white backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070612]"
              >
                Login
              </Link>
            </BlurIn>

            <BlurIn
              delay={0.68}
              reducedMotion={reducedMotion}
              className="grid max-w-2xl grid-cols-1 gap-2 text-xs text-white/85 sm:grid-cols-3 sm:text-sm"
            >
              <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 backdrop-blur-sm">
                Keeper round tracking
              </div>
              <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 backdrop-blur-sm">
                Main draft decision support
              </div>
              <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 backdrop-blur-sm">
                Taxi round tracking
              </div>
            </BlurIn>
          </div>
        </div>
      </section>
    </main>
  );
}
