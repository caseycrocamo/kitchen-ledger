import { signal } from '@preact/signals'
import { fetchAgePerDay, fetchInsights, fetchServingsPerDay } from './api'
import type { AgePerDay, Insight, ServingsPerDay } from './types'

export const servingsPerDay = signal<ServingsPerDay[]>([])
export const agePerDay = signal<AgePerDay[]>([])
export const insights = signal<Insight[]>([])
export const dashboardLoading = signal(true)
export const dashboardError = signal<string | null>(null)

export async function loadDashboard(): Promise<void> {
  dashboardLoading.value = true
  dashboardError.value = null
  try {
    const [servings, age, ins] = await Promise.all([
      fetchServingsPerDay(),
      fetchAgePerDay(),
      fetchInsights(),
    ])
    servingsPerDay.value = servings
    agePerDay.value = age
    insights.value = ins
  } catch (err) {
    dashboardError.value = err instanceof Error ? err.message : 'Failed to load dashboard.'
  } finally {
    dashboardLoading.value = false
  }
}
