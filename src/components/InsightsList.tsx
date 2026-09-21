import type { Insight } from '../types'

interface InsightsListProps {
  insights: Insight[]
}

const RESTOCK_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
    <path d="M10.75 10.818v2.614A3.13 3.13 0 0 0 11.888 13c.482-.315.612-.648.612-.875 0-.227-.13-.56-.612-.875a3.13 3.13 0 0 0-1.138-.432ZM8.33 8.62c.053.055.115.11.184.164.208.16.46.284.736.363V6.603a2.45 2.45 0 0 0-.35.13c-.14.065-.27.143-.386.233-.377.292-.514.627-.514.909 0 .184.058.39.202.592.037.051.08.102.128.152Z" />
    <path
      fill-rule="evenodd"
      d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v.10101a4.02 4.02 0 0 0-1.192.409A2.85 2.85 0 0 0 6.5 7.926c0 .603.212 1.184.628 1.658.318.361.723.612 1.148.79v2.847a3.1 3.1 0 0 1-.833-.408.75.75 0 1 0-.878 1.216c.49.354 1.08.586 1.711.673V15a.75.75 0 0 0 1.5 0v-.101a3.63 3.63 0 0 0 1.192-.409 2.85 2.85 0 0 0 1.558-2.417c0-.603-.212-1.184-.628-1.658a3.06 3.06 0 0 0-1.147-.79V6.778c.281.083.541.211.751.375a.75.75 0 1 0 .916-1.187 3.6 3.6 0 0 0-1.667-.667V5Z"
      clip-rule="evenodd"
    />
  </svg>
)

const AGING_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
    <path
      fill-rule="evenodd"
      d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z"
      clip-rule="evenodd"
    />
  </svg>
)

export function InsightsList({ insights }: InsightsListProps) {
  if (insights.length === 0) {
    return (
      <div class="text-center py-10 text-slate-500">
        <p class="text-sm">No alerts right now — you're all stocked up and everything's fresh!</p>
      </div>
    )
  }

  return (
    <ul class="flex flex-col divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white overflow-hidden">
      {insights.map((insight) => (
        <li
          key={`${insight.type}-${insight.itemId}`}
          class="flex items-start gap-3 px-4 py-3"
        >
          <span
            class={`shrink-0 mt-0.5 ${
              insight.type === 'restock' ? 'text-amber-600' : 'text-sky-600'
            }`}
          >
            {insight.type === 'restock' ? RESTOCK_ICON : AGING_ICON}
          </span>
          <div>
            <p class="text-sm text-slate-800">{insight.message}</p>
            <p class="text-xs text-slate-500 mt-0.5">
              {insight.servings} serving{insight.servings === 1 ? '' : 's'} left
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}
