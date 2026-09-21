import { useEffect, useRef } from 'preact/hooks'
import { Chart } from 'chart.js/auto'
import type { AgePerDay } from '../types'
import { colorForItem } from './chartColors'

interface AgeChartProps {
  data: AgePerDay[]
}

export function AgeChart({ data }: AgeChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    const items = data[0]?.items ?? []
    const datasets = items.map((item, i) => {
      const color = colorForItem(item.itemId, i)
      return {
        label: item.itemName,
        data: data.map((day) => day.items[i]?.avgAgeDays ?? null),
        borderColor: color,
        backgroundColor: color,
        spanGaps: false,
      }
    })

    chartRef.current?.destroy()
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: data.map((d) => d.date),
        datasets,
      },
      options: {
        responsive: true,
        plugins: { legend: { display: datasets.length > 1, position: 'bottom' } },
        scales: { y: { beginAtZero: true } },
      },
    })

    return () => {
      chartRef.current?.destroy()
      chartRef.current = null
    }
  }, [data])

  return <canvas ref={canvasRef} role="img" aria-label="Average age of servings eaten per day, by item" />
}
