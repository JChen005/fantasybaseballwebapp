import Link from 'next/link';
import { ArrowRight, CheckCircle2, Database, Shield, Target } from 'lucide-react';
import BrandMark from 'components/BrandMark';

const pillars = [
  {
    icon: Target,
    title: 'Draft Focus',
    body: 'DraftElite keeps league setup, keeper context, live player search, and round-by-round decisions in one place.',
  },
  {
    icon: Database,
    title: 'Real Data Flow',
    body: 'The app separates DraftKit from the external Player API so draft tools stay clean while player data remains reusable.',
  },
  {
    icon: Shield,
    title: 'Private Workspaces',
    body: 'Cookie-based sessions and league-scoped workflows keep each draft room stable, persistent, and isolated.',
  },
];

const features = [
  'League configuration for keeper, main draft, and taxi-round formats',
  'Live player lookup and valuation support during draft prep and draft day',
  'A product structure designed for class-scale leagues without fake enterprise complexity',
  'A split frontend, backend, and Player API architecture that mirrors a real deployment setup',
];

export const metadata = {
  title: 'About | DraftElite',
  description: 'About DraftElite and how the fantasy baseball draft assistant is structured.',
};

export default function AboutPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07111d] text-white">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(7,17,29,0.96),rgba(7,17,29,0.84),rgba(7,17,29,0.52))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_16%,rgba(97,210,255,0.18),transparent_28%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(64,224,183,0.16),transparent_22%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:18px_18px] opacity-[0.16]" />

      <section className="relative z-10 flex min-h-screen w-full flex-col px-5 pb-10 pt-0 sm:px-6 lg:px-8">
        <div className="-mx-5 flex w-[calc(100%+2.5rem)] items-center justify-between border-b border-white/10 bg-[linear-gradient(180deg,rgba(16,27,44,0.52),rgba(12,21,36,0.28))] px-8 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.16)] backdrop-blur-xl sm:-mx-6 sm:w-[calc(100%+3rem)] lg:-mx-8 lg:w-[calc(100%+4rem)]">
          <Link href="/" className="flex items-center gap-4 pl-1">
            <BrandMark />
            <div>
              <p className="text-lg font-semibold tracking-[0.01em] text-white">DraftElite</p>
              <p className="text-xs text-white/55">Fantasy baseball draft assistant</p>
            </div>
          </Link>

          <nav className="flex items-center gap-5 text-sm text-white/78">
            <Link className="rounded-full bg-white/10 px-4 py-2 font-medium text-white" href="/about">
              About
            </Link>
            <Link
              href="/login"
              className="rounded-full px-4 py-2 transition hover:bg-white/10 hover:text-white"
            >
              Login
            </Link>
          </nav>
        </div>

        <div className="mx-auto flex w-full max-w-[1400px] flex-1 items-start py-10 lg:py-14">
          <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.7fr)]">
            <section className="relative overflow-hidden rounded-[28px] border border-white/14 bg-[linear-gradient(135deg,rgba(10,18,30,0.22),rgba(10,16,28,0.12)_58%,rgba(109,223,255,0.06))] px-6 py-7 shadow-[0_18px_46px_rgba(4,8,18,0.2),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-lg sm:px-8 sm:py-8">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(134,236,255,0.08),transparent_32%)]" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />

              <div className="relative">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/68">
                  About DraftElite
                </p>
                <h1 className="mt-5 max-w-3xl text-[3rem] font-medium leading-[1.04] tracking-[-0.05em] text-white sm:text-[4rem] lg:text-[4.45rem]">
                  <span className="block">Built for fantasy</span>
                  <span className="block">
                    drafts that move <span className="font-serif italic font-normal">fast.</span>
                  </span>
                </h1>

                <p className="mt-5 max-w-3xl text-[15px] leading-8 text-white/82 sm:text-[17px]">
                  DraftElite is a fantasy baseball draft assistant focused on the actual decision
                  moments that matter: setting league rules correctly, tracking keeper impact,
                  surfacing player data quickly, and keeping your board readable when the room gets
                  busy.
                </p>

                <ul className="mt-6 space-y-3 text-sm text-white/78">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#54d7b0]" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-2 rounded-full bg-[#54d7b0] px-5 py-2.5 text-sm font-semibold text-[#07111d] shadow-[0_12px_30px_rgba(84,215,176,0.28)] transition hover:-translate-y-0.5 hover:bg-[#68e4bf]"
                  >
                    Register
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/"
                    className="inline-flex items-center rounded-full border border-white/14 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/16"
                  >
                    Back Home
                  </Link>
                </div>
              </div>
            </section>

            <aside className="grid gap-5">
              {pillars.map(({ icon: Icon, title, body }) => (
                <section
                  key={title}
                  className="rounded-[24px] border border-white/12 bg-[linear-gradient(180deg,rgba(17,28,44,0.42),rgba(9,16,28,0.24))] p-6 shadow-[0_18px_44px_rgba(0,0,0,0.18)] backdrop-blur-md"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/8">
                    <Icon className="h-5 w-5 text-[#63dfbc]" />
                  </div>
                  <h2 className="mt-4 text-xl font-semibold text-white">{title}</h2>
                  <p className="mt-2 text-sm leading-7 text-white/72">{body}</p>
                </section>
              ))}
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
