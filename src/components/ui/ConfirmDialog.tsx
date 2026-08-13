import { useState, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}

export function ConfirmDialog({
  open, title, description, confirmLabel = 'Confirm',
  cancelLabel = 'Cancel', variant = 'default',
  onConfirm, onCancel, children,
}: ConfirmDialogProps) {
  if (!open) return null;

  const confirmStyle =
    variant === 'danger'
      ? 'bg-red-500 hover:bg-red-600 text-white border-0'
      : variant === 'warning'
      ? 'bg-amber-500 hover:bg-amber-600 text-white border-0'
      : '';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onCancel()}
    >
      <div className="glass-card w-full max-w-xs p-5 relative animate-in fade-in-0 zoom-in-95 duration-150">
        <button
          onClick={onCancel}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3 mb-4">
          <div className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
            variant === 'danger' ? 'bg-red-500/15' :
            variant === 'warning' ? 'bg-amber-500/15' :
            'bg-primary/15'
          )}>
            <AlertTriangle className={cn(
              'h-4 w-4',
              variant === 'danger' ? 'text-red-500' :
              variant === 'warning' ? 'text-amber-500' :
              'text-primary'
            )} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
          </div>
        </div>

        {children && <div className="mb-4">{children}</div>}

        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="outline" onClick={onCancel} className="h-8">
            {cancelLabel}
          </Button>
          <Button size="sm" onClick={onConfirm} className={cn('h-8', confirmStyle)}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── useConfirm hook for programmatic confirm dialogs ──────────────────────────
interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
}

export function useConfirm() {
  const [state, setState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);

  const confirm = (opts: ConfirmOptions): Promise<boolean> =>
    new Promise(resolve => setState({ ...opts, resolve }));

  const dialog = state ? (
    <ConfirmDialog
      open={true}
      title={state.title}
      description={state.description}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      variant={state.variant}
      onConfirm={() => { state.resolve(true); setState(null); }}
      onCancel={() => { state.resolve(false); setState(null); }}
    />
  ) : null;

  return { confirm, dialog };
}
