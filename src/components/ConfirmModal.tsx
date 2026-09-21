import { useEffect, useRef } from 'preact/hooks'

export interface ConfirmModalProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Small, reusable confirmation dialog styled to match the app — a stand-in for the
 * native `confirm()` so we control appearance, keyboard behavior, and can show a busy
 * state while an async action (e.g. delete) is in flight.
 */
export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return

    confirmButtonRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) {
        event.preventDefault()
        onCancel()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, busy, onCancel])

  if (!open) return null

  return (
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4"
      onClick={() => !busy && onCancel()}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-message"
        class="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="confirm-modal-title" class="text-lg font-semibold text-slate-900">
          {title}
        </h2>
        <p id="confirm-modal-message" class="mt-2 text-sm text-slate-600">
          {message}
        </p>
        <div class="mt-6 flex justify-end gap-3">
          <button
            type="button"
            class="rounded-md px-4 py-2.5 min-h-11 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            onClick={onCancel}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            class={`rounded-md px-4 py-2.5 min-h-11 text-sm font-medium text-white disabled:opacity-50 ${
              destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-900 hover:bg-slate-800'
            }`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
