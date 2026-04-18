'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, WifiOff } from 'lucide-react';
import { GitHub } from '@/assets/icons';

const ISSUES_URL = 'https://github.com/matteocelani/f1-telemetry/issues';

export function ServiceUnavailable() {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden p-6">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_50%,color-mix(in_srgb,var(--color-foreground),transparent_97%),transparent_70%)]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="flex max-w-md flex-col items-center gap-8 rounded-3xl border border-border/40 bg-card/40 p-10 text-center shadow-2xl backdrop-blur-xl md:p-16"
      >
        <div className="flex items-center gap-3 rounded-full border border-border/40 bg-foreground/5 px-4 py-1.5 shadow-inner">
          <WifiOff className="size-3 text-red-500" />
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            No Signal
          </span>
        </div>

        <div className="flex flex-col items-center gap-3">
          <h1 className="text-7xl font-black tabular-nums tracking-tighter text-foreground md:text-8xl">
            PIT
          </h1>
          <p className="text-sm text-muted-foreground">
            The telemetry server is in the garage right now.
          </p>
          <p className="max-w-xs text-xs text-muted-foreground/60">
            Don&apos;t worry — we&apos;ll reconnect automatically when it&apos;s
            back on track.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3">
          <a
            href={ISSUES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full border border-border/40 px-5 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
          >
            <GitHub className="size-3.5" />
            Report an Issue
          </a>

          <Link
            href="/"
            className="flex items-center gap-2 rounded-full border border-border/40 px-5 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Back to Pit Lane
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
