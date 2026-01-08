import { useQuery } from '@tanstack/react-query'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Monitor, Smartphone, Tablet, Loader2 } from 'lucide-react'
import { useTimeRange } from './TimeRangeContext'
import { useFilters } from './App'
import { mockDataAPI } from './apiClient'
import { MetricCard, Card, SectionHeader, StatusBadge } from './ui'

// Web Vitals thresholds (Google standards)
const thresholds = {
  lcp: { good: 2.5, poor: 4.0 },
  fid: { good: 100, poor: 300 },
  cls: { good: 0.1, poor: 0.25 },
  inp: { good: 200, poor: 500 },
  ttfb: { good: 800, poor: 1800 },
  fcp: { good: 1.8, poor: 3.0 },
}

function getVitalStatus(value: number, metric: keyof typeof thresholds): 'good' | 'warning' | 'critical' {
  const t = thresholds[metric]
  if (value <= t.good) return 'good'
  if (value <= t.poor) return 'warning'
  return 'critical'
}

function getVitalColor(status: 'good' | 'warning' | 'critical'): string {
  return status === 'good' ? '#10b981' : status === 'warning' ? '#f59e0b' : '#ef4444'
}

export function WebVitalsPage() {
  const { range } = useTimeRange()
  const { appliedBrand, appliedCountry } = useFilters()

  const filters = {
    brand: appliedBrand,
    country: appliedCountry,
    timeRange: range,
  }

  const { data: vitals, isLoading: vitalsLoading } = useQuery({
    queryKey: ['web-vitals', appliedBrand, appliedCountry, range],
    queryFn: () => mockDataAPI.getWebVitals(filters),
  })

  const { data: timeSeriesData, isLoading: tsLoading } = useQuery({
    queryKey: ['web-vitals-timeseries', appliedBrand, appliedCountry, range],
    queryFn: () => mockDataAPI.getWebVitalsTimeSeries(filters),
  })

  const isLoading = vitalsLoading || tsLoading

  const lcpTrend = timeSeriesData?.lcp || []
  const clsTrend = timeSeriesData?.cls || []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-theme-muted" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Core Web Vitals */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          title="LCP (p75)"
          value={`${vitals?.lcp.value.toFixed(2)}s`}
          subtitle="Largest Contentful Paint"
          status={getVitalStatus(vitals?.lcp.value || 0, 'lcp')}
          tooltip="Время загрузки самого большого видимого элемента (изображение или текстовый блок). Критическая метрика для воспринимаемой скорости загрузки."
          thresholds={{ good: '≤2.5s', warning: '2.5-4s', critical: '>4s' }}
        />
        <MetricCard
          title="FID (p75)"
          value={`${vitals?.fid.value.toFixed(0)}ms`}
          subtitle="First Input Delay"
          status={getVitalStatus(vitals?.fid.value || 0, 'fid')}
          tooltip="Задержка между первым взаимодействием пользователя (клик, тап) и реакцией браузера. Влияет на отзывчивость интерфейса."
          thresholds={{ good: '≤100ms', warning: '100-300ms', critical: '>300ms' }}
        />
        <MetricCard
          title="CLS (p75)"
          value={vitals?.cls.value.toFixed(3) || '0'}
          subtitle="Cumulative Layout Shift"
          status={getVitalStatus(vitals?.cls.value || 0, 'cls')}
          tooltip="Визуальная стабильность — насколько 'прыгает' контент при загрузке. Измеряется как доля смещённой области viewport."
          thresholds={{ good: '≤0.1', warning: '0.1-0.25', critical: '>0.25' }}
        />
        <MetricCard
          title="INP (p75)"
          value={`${vitals?.inp.value.toFixed(0)}ms`}
          subtitle="Interaction to Next Paint"
          status={getVitalStatus(vitals?.inp.value || 0, 'inp')}
          tooltip="Отзывчивость интерфейса — время от любого взаимодействия до визуального обновления. Заменил FID как основную метрику в 2024."
          thresholds={{ good: '≤200ms', warning: '200-500ms', critical: '>500ms' }}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* LCP Trend */}
        <Card>
          <SectionHeader title="LCP Trend" subtitle="Largest Contentful Paint (s)" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={lcpTrend}>
                <defs>
                  <linearGradient id="lcpGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="time"
                  tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  stroke="#6b7280"
                  fontSize={11}
                />
                <YAxis stroke="#6b7280" fontSize={11} domain={[0, 'auto']} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                  }}
                  labelFormatter={(t) => new Date(t).toLocaleString()}
                  formatter={(value: number) => [`${value.toFixed(2)}s`, 'LCP']}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#lcpGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex gap-4 text-xs text-theme-muted">
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-emerald-500" /> Good: ≤2.5s
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-amber-500" /> Needs improvement: ≤4s
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-red-500" /> Poor: &gt;4s
            </span>
          </div>
        </Card>

        {/* CLS Trend */}
        <Card>
          <SectionHeader title="CLS Trend" subtitle="Cumulative Layout Shift" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={clsTrend}>
                <defs>
                  <linearGradient id="clsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="time"
                  tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  stroke="#6b7280"
                  fontSize={11}
                />
                <YAxis stroke="#6b7280" fontSize={11} domain={[0, 0.3]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                  }}
                  labelFormatter={(t) => new Date(t).toLocaleString()}
                  formatter={(value: number) => [value.toFixed(3), 'CLS']}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#clsGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex gap-4 text-xs text-theme-muted">
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-emerald-500" /> Good: ≤0.1
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-amber-500" /> Needs improvement: ≤0.25
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-red-500" /> Poor: &gt;0.25
            </span>
          </div>
        </Card>
      </div>

      {/* Additional Vitals */}
      <Card>
        <SectionHeader title="Additional Metrics" subtitle="Other performance indicators" />
        <div className="grid grid-cols-3 gap-6">
          <div className="p-4 rounded-lg" style={{ background: 'var(--bg-card-alt)' }}>
            <div className="text-sm text-theme-muted mb-1">TTFB</div>
            <div className="text-2xl font-bold" style={{ color: getVitalColor(getVitalStatus(vitals?.ttfb.value || 0, 'ttfb')) }}>
              {vitals?.ttfb.value.toFixed(0)}ms
            </div>
            <div className="text-xs text-theme-muted mt-1">Time to First Byte</div>
          </div>
          <div className="p-4 rounded-lg" style={{ background: 'var(--bg-card-alt)' }}>
            <div className="text-sm text-theme-muted mb-1">FCP</div>
            <div className="text-2xl font-bold" style={{ color: getVitalColor(getVitalStatus(vitals?.fcp.value || 0, 'fcp')) }}>
              {vitals?.fcp.value.toFixed(2)}s
            </div>
            <div className="text-xs text-theme-muted mt-1">First Contentful Paint</div>
          </div>
          <div className="p-4 rounded-lg" style={{ background: 'var(--bg-card-alt)' }}>
            <div className="text-sm text-theme-muted mb-1">Overall</div>
            <div className="text-2xl font-bold text-theme-primary">
              <StatusBadge status={
                (vitals?.lcp.value || 0) <= 2.5 && (vitals?.cls.value || 0) <= 0.1 && (vitals?.inp.value || 0) <= 200
                  ? 'healthy'
                  : 'degraded'
              } />
            </div>
            <div className="text-xs text-theme-muted mt-1">Core Web Vitals</div>
          </div>
        </div>
      </Card>
    </div>
  )
}
