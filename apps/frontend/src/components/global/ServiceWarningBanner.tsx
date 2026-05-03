'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

const SERVICE_WARNING_TOAST_ID = 'service-unavailable-warning';
const GITHUB_REPO_URL = 'https://github.com/matteocelani/f1-telemetry';

export function ServiceWarningBanner() {
  useEffect(() => {
    toast.warning('F1 Telemetry is currently unavailable', {
      id: SERVICE_WARNING_TOAST_ID,
      duration: Infinity,
      closeButton: true,
      description: (
        <span>
          Due to IP blocking by Formula 1, the hosted version is currently
          down. You can selfhost it, check the{' '}
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="underline font-medium"
          >
            GitHub repo
          </a>{' '}
          for instructions.
        </span>
      ),
    });
  }, []);

  return null;
}
