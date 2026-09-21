import { useEffect, useRef } from 'preact/hooks'
import { Chart } from 'chart.js/auto'
import type { AgePerDay } from '../types'

interface AgeChartProps {
  data: AgePerDay[]
}

export function AgeChart({ data }: AgeChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    chartRef.current?.destroy()
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: data.map((d) => d.date),
        datasets: [
          {
            label: 'Average age (days)',
            data: data.map((d) => d.avgAgeDays),
            borderColor: '#0284c7',
            backgroundColor: '#0284c7',
            spanGaps: false,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } },
      },
    })

    return () => {
      chartRef.current?.destroy()
      chartRef.current = null
    }
  }, [data])

  return <canvas ref={canvasRef} role="img" aria-label="Average age of servings eaten per day" />
}
