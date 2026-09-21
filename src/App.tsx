import { useEffect, useState } from 'preact/hooks'
import { loadItems } from './state'
import { ItemList } from './components/ItemList'
import { ItemFormModal } from './components/ItemFormModal'
import { Toolbar } from './components/Toolbar'
import type { Item } from './types'

type ModalState = { mode: 'create' } | { mode: 'edit'; item: Item } | null

export function App() {
  const [modal, setModal] = useState<ModalState>(null)

  useEffect(() => {
    loadItems()
  }, [])

  return (
    <div class="min-h-screen bg-slate-50">
      <header class="bg-white border-b border-slate-200">
        <div class="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 class="text-2xl font-bold text-slate-900">Kitchen Ledger</h1>
          <button
            type="button"
            onClick={() => setModal({ mode: 'create' })}
            class="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            + Add item
          </button>
        </div>
      </header>
      <main class="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <Toolbar />
        <ItemList onEdit={(item) => setModal({ mode: 'edit', item })} />
      </main>
      {modal && (
        <ItemFormModal
          mode={modal.mode}
          item={modal.mode === 'edit' ? modal.item : undefined}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
