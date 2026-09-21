import { useEffect, useRef } from 'preact/hooks'
import { Chart } from 'chart.js/auto'
import type { ServingsPerDay } from '../types'
import { colorForItem } from './chartColors'

interface ServingsChartProps {
  data: ServingsPerDay[]
}

export function ServingsChart({ data }: ServingsChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    const items = data[0]?.items ?? []
    const datasets = items.map((item, i) => ({
      label: item.itemName,
      data: data.map((day) => day.items[i]?.quantity ?? 0),
      backgroundColor: colorForItem(item.itemId, i),
      stack: 'servings',
    }))

    chartRef.current?.destroy()
    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: data.map((d) => d.date),
        datasets,
      },
      options: {
        responsive: true,
        plugins: { legend: { display: datasets.length > 1, position: 'bottom' } },
        scales: {
          x: { stacked: true },
          y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } },
        },
      },
    })

    return () => {
      chartRef.current?.destroy()
      chartRef.current = null
    }
  }, [data])

  return <canvas ref={canvasRef} role="img" aria-label="Servings consumed per day, by item" />
}
