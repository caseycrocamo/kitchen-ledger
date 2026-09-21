import { useEffect } from 'preact/hooks'
import { fetchItems } from './api'
import ItemList from './components/ItemList'
import { items, itemsError, itemsLoading } from './state'

export function loadItems() {
  itemsLoading.value = true
  itemsError.value = null
  fetchItems()
    .then((data) => {
      items.value = data
    })
    .catch((err: unknown) => {
      itemsError.value = err instanceof Error ? err.message : 'Failed to load items.'
    })
    .finally(() => {
      itemsLoading.value = false
    })
}

export default function App() {
  useEffect(() => {
    loadItems()
  }, [])

  return (
    <div class="min-h-screen bg-slate-50">
      <header class="border-b border-slate-200 bg-white">
        <div class="mx-auto max-w-6xl px-4 py-4">
          <h1 class="text-2xl font-bold text-slate-900">Kitchen Ledger</h1>
          <p class="text-sm text-slate-600">Track what's in your kitchen.</p>
        </div>
      </header>
      <main class="mx-auto max-w-6xl px-4 py-6">
        <ItemList />
      </main>
    </div>
  )
}
