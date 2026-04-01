'use client';

import Link from 'next/link';
import { ThemeToggle } from '@/components/global/ThemeToggle';
import { GitHub } from '@/assets/icons';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative z-10 w-full border-t border-border/40 bg-card/20 py-12 px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-8 md:flex-row">
        <div className="flex flex-col items-center gap-2 md:items-start">
          <div className="flex items-center gap-2">
            <span className="text-sm font-light tracking-tight flex gap-2 text-muted-foreground">
              <span className="font-semibold text-foreground">F1</span>{' '}
              <span className="tracking-widest opacity-80 uppercase">
                Telemetry
              </span>
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {currentYear} Open Source Project. Built for the community.
          </p>
          <p className="max-w-md text-center text-2xs leading-relaxed text-muted-foreground/60 md:text-left">
            This project is not associated with, endorsed by, or officially connected to
            Formula 1, the FIA, Formula One World Championship Limited, Formula One
            Management, or any of their subsidiaries or affiliates. F1 and related marks
            are trademarks of Formula One Licensing B.V.
          </p>
        </div>

        <div className="flex items-center gap-6">
          <Link
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <GitHub className="h-5 w-5" />
          </Link>
          <div className="h-4 w-px bg-border/40" />
          <ThemeToggle />
        </div>
      </div>
    </footer>
  );
}
