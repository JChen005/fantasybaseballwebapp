'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import AppNav from 'components/AppNav';
import { draftkitApi } from 'lib/draftkitApi';

export default function ProtectedLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const hasSideRail =
    /^\/league\/[^/]+\/(?:draft(?:\/|$)|players\/[^/]+|keeper(?:\/|$)|taxi(?:\/|$)|config(?:\/|$)|post-draft(?:\/|$))/.test(
      pathname || ''
    );
  const shellClass = `app-shell ${loading ? 'py-10' : 'py-6'} ${hasSideRail ? 'xl:max-w-none' : ''}`;
  const contentClass = hasSideRail ? 'xl:ml-48 xl:pl-5' : '';

  useEffect(() => {
    let ignore = false;

    async function checkSession() {
      try {
        await draftkitApi.me();
        if (!ignore) {
          setLoading(false);
        }
      } catch {
        if (!ignore) {
          router.replace('/login');
        }
      }
    }

    checkSession();

    return () => {
      ignore = true;
    };
  }, [router]);

  const onLogout = async () => {
    await draftkitApi.logout().catch(() => null);
    router.replace('/');
  };

  if (loading) {
    return (
      <main className={shellClass}>
        <section className={`${contentClass} panel`}>Checking session...</section>
      </main>
    );
  }

  return (
    <main className={shellClass}>
      <div className={contentClass}>
        <AppNav onLogout={onLogout} />
        {children}
      </div>
    </main>
  );
}
