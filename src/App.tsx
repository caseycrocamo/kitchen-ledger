// Root component. Chunk 05 stand-in (shell + data load) + chunk 06 stand-in (ItemList
// mount) + this chunk's real work: add-item button and modal open/mode state.

import { useEffect, useState } from 'preact/hooks'
import ItemList from './components/ItemList'
import ItemFormModal from './components/ItemFormModal'
import { loadItems } from './state'
import type { Item } from './types'

type ModalState = { mode: 'create' } | { mode: 'edit'; item: Item } | null

export default function App() {
  const [modal, setModal] = useState<ModalState>(null)

  useEffect(() => {
    loadItems()
  }, [])

  return (
    <div class="min-h-screen bg-slate-50">
      <header class="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <h1 class="text-xl font-bold text-slate-900">Kitchen Ledger</h1>
        <button
          type="button"
          onClick={() => setModal({ mode: 'create' })}
          class="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          + Add item
        </button>
      </header>
      <main class="px-4 py-6">
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
