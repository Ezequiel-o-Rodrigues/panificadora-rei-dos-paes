"use client";

import { AlertTriangle } from "lucide-react";
import { Dialog, DialogFooter } from "./Dialog";
import { Button } from "./Button";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  loading?: boolean;
  variant?: "danger" | "primary";
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title = "Confirmar ação",
  message,
  confirmLabel = "Confirmar",
  onConfirm,
  loading,
  variant = "danger",
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title}>
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rust-500/15 text-rust-400">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <p className="text-sm text-onyx-200 leading-relaxed">{message}</p>
      </div>
      <DialogFooter>
        <Button
          variant="ghost"
          onClick={() => onOpenChange(false)}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button
          variant={variant}
          onClick={onConfirm}
          loading={loading}
        >
          {confirmLabel}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
