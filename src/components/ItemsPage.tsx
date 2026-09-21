import { useState } from 'preact/hooks'
import { ItemList } from './ItemList'
import { ItemFormModal } from './ItemFormModal'
import { Toolbar } from './Toolbar'
import type { Item } from '../types'

type ModalState = { mode: 'create' } | { mode: 'edit'; item: Item } | null

export function ItemsPage() {
  const [modal, setModal] = useState<ModalState>(null)

  return (
    <>
      <div class="flex justify-end">
        <button
          type="button"
          onClick={() => setModal({ mode: 'create' })}
          class="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
        >
          + Add item
        </button>
      </div>
      <Toolbar />
      <ItemList onEdit={(item) => setModal({ mode: 'edit', item })} />
      {modal && (
        <ItemFormModal
          mode={modal.mode}
          item={modal.mode === 'edit' ? modal.item : undefined}
          onClose={() => setModal(null)}
        />
      )}
    </>
  )
}
