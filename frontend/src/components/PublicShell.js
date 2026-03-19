import Link from 'next/link';
import BrandMark from 'components/BrandMark';

export default function PublicShell({ children }) {
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
            <Link className="rounded-full px-4 py-2 transition hover:bg-white/10 hover:text-white" href="/about">
              About
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-white/10 px-4 py-2 font-medium text-white transition hover:bg-white/16"
            >
              Login
            </Link>
          </nav>
        </div>

        {children}
      </section>
    </main>
  );
}
