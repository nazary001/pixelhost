"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CATEGORIES, SITE_NAME } from "@/lib/config";

const NAV_LINKS = [
  ...CATEGORIES.map((c) => ({ href: `/category/${c.slug}`, label: c.name })),
  { href: "/experts", label: "Experts" },
];

function SearchForm({ autoFocus = false }: { autoFocus?: boolean }) {
  return (
    <form action="/search" role="search" className="flex w-full items-center gap-2">
      <input
        type="search"
        name="q"
        required
        autoFocus={autoFocus}
        placeholder="Search..."
        aria-label="Search articles"
        className="field"
      />
      <button type="submit" className="btn-pine shrink-0">
        Search
      </button>
    </form>
  );
}

export default function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Close the menus on navigation ("adjust state during render" pattern —
  // https://react.dev/learn/you-might-not-need-an-effect).
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMenuOpen(false);
    setSearchOpen(false);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setSearchOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <header className="bg-ink text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="shrink-0 text-2xl font-bold tracking-tight"
          aria-label={`${SITE_NAME} — home`}
        >
          Pixel<span className="text-marker">Host</span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-6 lg:flex">
          {NAV_LINKS.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-[15px] font-medium transition-colors hover:text-marker ${
                  active ? "text-marker" : "text-white/90"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <form
            action="/search"
            role="search"
            className="hidden items-center gap-2 md:flex"
          >
            <input
              type="search"
              name="q"
              required
              placeholder="Search..."
              aria-label="Search articles"
              className="w-40 rounded-md border border-white/20 bg-white px-3 py-1.5 text-sm text-ink placeholder:text-moss focus:border-marker focus:outline-none lg:w-48"
            />
            <button type="submit" className="btn-pine !py-1.5 text-sm">
              Search
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              setSearchOpen((v) => !v);
              setMenuOpen(false);
            }}
            aria-expanded={searchOpen}
            aria-controls="header-search-panel"
            aria-label={searchOpen ? "Close search" : "Open search"}
            className="flex h-10 w-10 items-center justify-center rounded-md transition-colors hover:bg-white/10 md:hidden"
          >
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.8-3.8" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => {
              setMenuOpen((v) => !v);
              setSearchOpen(false);
            }}
            aria-expanded={menuOpen}
            aria-controls="header-menu-panel"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="flex h-10 w-10 flex-col items-center justify-center gap-[5px] rounded-md transition-colors hover:bg-white/10 lg:hidden"
          >
            <span
              className={`h-[2px] w-5 bg-white transition-transform ${menuOpen ? "translate-y-[7px] rotate-45" : ""}`}
            />
            <span className={`h-[2px] w-5 bg-white ${menuOpen ? "opacity-0" : ""}`} />
            <span
              className={`h-[2px] w-5 bg-white transition-transform ${menuOpen ? "-translate-y-[7px] -rotate-45" : ""}`}
            />
          </button>
        </div>
      </div>

      {searchOpen && (
        <div id="header-search-panel" className="border-t border-white/10">
          <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
            <SearchForm autoFocus />
          </div>
        </div>
      )}

      {menuOpen && (
        <nav
          id="header-menu-panel"
          aria-label="Mobile"
          className="border-t border-white/10 lg:hidden"
        >
          <ul className="mx-auto max-w-6xl px-4 py-2 sm:px-6">
            {NAV_LINKS.map((link) => (
              <li key={link.href} className="border-b border-white/10 last:border-b-0">
                <Link
                  href={link.href}
                  className="block py-3 text-[15px] font-medium text-white/90 hover:text-marker"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
