import { useEffect, useRef } from 'preact/hooks'
import { Chart } from 'chart.js/auto'
import type { ServingsPerDay } from '../types'

interface ServingsChartProps {
  data: ServingsPerDay[]
}

export function ServingsChart({ data }: ServingsChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    chartRef.current?.destroy()
    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: data.map((d) => d.date),
        datasets: [
          {
            label: 'Servings consumed',
            data: data.map((d) => d.consumed),
            backgroundColor: '#059669',
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
      },
    })

    return () => {
      chartRef.current?.destroy()
      chartRef.current = null
    }
  }, [data])

  return <canvas ref={canvasRef} role="img" aria-label="Servings consumed per day" />
}
