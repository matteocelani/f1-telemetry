import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'F1 Telemetry',
    short_name: 'F1 Telemetry',
    description:
      'Open-source real-time Formula 1 telemetry dashboard with live timing, track map and race strategy.',
    start_url: '/',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#09090b',
    icons: [
      {
        src: '/images/256.png',
        sizes: '256x256',
        type: 'image/png',
      },
      {
        src: '/images/512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/images/1024.png',
        sizes: '1024x1024',
        type: 'image/png',
      },
    ],
  };
}
