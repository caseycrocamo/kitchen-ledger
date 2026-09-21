import { useEffect } from 'preact/hooks'
import { loadItems, loadTags } from './state'
import { currentPath, navigate } from './router'
import { HeaderMenu } from './components/HeaderMenu'
import { ItemsPage } from './components/ItemsPage'
import { DashboardPage } from './components/DashboardPage'

export function App() {
  useEffect(() => {
    loadItems()
    loadTags()
  }, [])

  const onDashboard = currentPath.value === '/dashboard'

  return (
    <div class="min-h-screen bg-slate-50">
      <header class="bg-white border-b border-slate-200">
        <div class="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div class="flex items-center gap-2">
            {onDashboard && (
              <button
                type="button"
                onClick={() => navigate('/')}
                aria-label="Back"
                class="inline-flex items-center justify-center w-11 h-11 -ml-2 rounded-md text-slate-600 hover:bg-slate-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
                  <path
                    fill-rule="evenodd"
                    d="M12.79 5.23a.75.75 0 0 1-.02 1.06L8.832 10l3.938 3.71a.75.75 0 1 1-1.04 1.08l-4.5-4.25a.75.75 0 0 1 0-1.08l4.5-4.25a.75.75 0 0 1 1.06.02Z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>
            )}
            <h1 class="text-2xl font-bold text-slate-900">Kitchen Ledger</h1>
          </div>
          <HeaderMenu />
        </div>
      </header>
      <main class="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {onDashboard ? <DashboardPage /> : <ItemsPage />}
      </main>
    </div>
  )
}
