'use client';

import * as ResizablePrimitive from 'react-resizable-panels';
import { cn } from '@/lib/utils';

function ResizablePanelGroup({
  className,
  ...props
}: ResizablePrimitive.GroupProps) {
  return (
    <ResizablePrimitive.Group
      data-slot="resizable-panel-group"
      className={cn(
        'flex h-full w-full aria-[orientation=vertical]:flex-col',
        className
      )}
      {...props}
    />
  );
}

function ResizablePanel({ ...props }: ResizablePrimitive.PanelProps) {
  return <ResizablePrimitive.Panel data-slot="resizable-panel" {...props} />;
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: ResizablePrimitive.SeparatorProps & {
  withHandle?: boolean;
}) {
  return (
    <ResizablePrimitive.Separator
      data-slot="resizable-handle"
      className={cn(
        'group relative flex items-center justify-center outline-none border-border transition-colors',
        'w-px border-r aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full aria-[orientation=horizontal]:border-r-0 aria-[orientation=horizontal]:border-b',
        'hover:border-foreground/20 active:border-foreground/30',
        className
      )}
      {...props}
    >
      {withHandle && (
        <div
          className={cn(
            'z-10 flex shrink-0 items-center justify-center rounded-full bg-muted/80 backdrop-blur-sm transition-colors',
            'group-hover:bg-muted group-active:bg-accent',
            'h-8 w-3 group-aria-[orientation=horizontal]:h-3 group-aria-[orientation=horizontal]:w-8'
          )}
        >
          <div className="flex flex-col gap-0.5 group-aria-[orientation=horizontal]:flex-row">
            <span className="size-0.5 rounded-full bg-muted-foreground/50" />
            <span className="size-0.5 rounded-full bg-muted-foreground/50" />
            <span className="size-0.5 rounded-full bg-muted-foreground/50" />
          </div>
        </div>
      )}
    </ResizablePrimitive.Separator>
  );
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup };
