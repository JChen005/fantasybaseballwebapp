'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SideBar(){
    let pathname = usePathname();
    pathname = pathname.substring(0, pathname.lastIndexOf('/'));
    return(
      <>
        <div className="fixed left-0 top-0 h-full w-55 p-3">
            <div className="rounded border border-slate-200 flex">
                  <Link className="text-s px-1" href={pathname+`/config`}>
                    Config
                  </Link>
                  <Link className="text-s px-1" href={pathname+`/keeper`}>
                    Keeper
                  </Link>
                  <Link className="text-s px-1" href={pathname+`/draft`}>
                    Draft
                  </Link>
                  <Link className="text-s px-1" href={pathname+`/taxi`}>
                    Taxi
                  </Link>
            </div>
            <input className = "input input-bordered my-2" placeholder = "Search Players..."/>
        </div>
      </>
    )
}
