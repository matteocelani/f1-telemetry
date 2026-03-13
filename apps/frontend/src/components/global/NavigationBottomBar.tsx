'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/live', label: 'Live', icon: '🔴' },
];

export function NavigationBottomBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-border bg-background/95 backdrop-blur-md md:hidden">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center gap-0.5 px-4 py-2 text-xs font-medium transition-colors',
              isActive
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
