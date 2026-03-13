'use client';

import { motion } from 'framer-motion';

interface CircuitSvgProps {
  path: string;
  viewBox: string;
}

const DRAW_DURATION = 2.5;
const DRAW_START_DELAY = 0.4;
const GLOW_OFFSET = 0.15;

export function CircuitSvg({ path, viewBox }: CircuitSvgProps) {
  return (
    <svg
      viewBox={viewBox}
      className="w-full max-w-48 md:max-w-56 h-auto"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Base stroke — wider, subtle */}
      <motion.path
        d={path}
        fill="none"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-foreground/15"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{
          pathLength: {
            duration: DRAW_DURATION,
            ease: 'easeInOut',
            delay: DRAW_START_DELAY,
          },
          opacity: { duration: 0.3, delay: DRAW_START_DELAY },
        }}
      />
      {/* Bright overlay — thinner, sharper */}
      <motion.path
        d={path}
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-foreground/40"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{
          pathLength: {
            duration: DRAW_DURATION,
            ease: 'easeInOut',
            delay: DRAW_START_DELAY + GLOW_OFFSET,
          },
          opacity: { duration: 0.3, delay: DRAW_START_DELAY + GLOW_OFFSET },
        }}
      />
    </svg>
  );
}
