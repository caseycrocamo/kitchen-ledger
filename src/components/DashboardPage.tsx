import { useEffect } from 'preact/hooks'
import type { ComponentChildren } from 'preact'
import {
  agePerDay,
  dashboardError,
  dashboardLoading,
  insights,
  loadDashboard,
  servingsPerDay,
} from '../dashboardState'
import { ServingsChart } from './ServingsChart'
import { AgeChart } from './AgeChart'
import { InsightsList } from './InsightsList'

function Section({ title, children }: { title: string; children: ComponentChildren }) {
  return (
    <div class="rounded-lg border border-slate-200 bg-white p-4">
      <h2 class="text-sm font-semibold text-slate-900 mb-3">{title}</h2>
      {children}
    </div>
  )
}

function SkeletonSection() {
  return (
    <div class="rounded-lg border border-slate-200 bg-white p-4 animate-pulse">
      <div class="h-4 w-40 bg-slate-200 rounded mb-4" />
      <div class="h-48 bg-slate-200 rounded" />
    </div>
  )
}

export function DashboardPage() {
  useEffect(() => {
    loadDashboard()
  }, [])

  if (dashboardLoading.value) {
    return (
      <div class="max-w-3xl mx-auto space-y-6">
        <SkeletonSection />
        <SkeletonSection />
        <SkeletonSection />
      </div>
    )
  }

  if (dashboardError.value) {
    return (
      <div class="max-w-md mx-auto text-center bg-red-50 border border-red-200 rounded-lg p-6 space-y-3">
        <p class="text-red-700 font-medium">Couldn't load the dashboard</p>
        <p class="text-red-600 text-sm">{dashboardError.value}</p>
        <button
          type="button"
          onClick={() => loadDashboard()}
          class="px-4 py-2 rounded bg-red-600 text-white text-sm font-medium hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div class="max-w-3xl mx-auto space-y-6">
      <Section title="Servings consumed per day">
        <ServingsChart data={servingsPerDay.value} />
      </Section>
      <Section title="Average age of servings eaten">
        <AgeChart data={agePerDay.value} />
      </Section>
      <Section title="Insights">
        <InsightsList insights={insights.value} />
      </Section>
    </div>
  )
}
