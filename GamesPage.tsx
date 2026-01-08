import { useQuery } from '@tanstack/react-query'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from 'recharts'
import { Gamepad2, Clock, CheckCircle, XCircle, Zap, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react'
import { useTimeRange } from './TimeRangeContext'
import { useFilters } from './App'
import { mockDataAPI } from './apiClient'
import { MetricCard, Card, SectionHeader, StatusBadge, ProgressBar } from './ui'

const PROVIDER_COLORS: Record<string, string> = {
  'Pragmatic': '#ef4444',
  'Evolution': '#f59e0b',
  'NetEnt': '#10b981',
  'Spribe': '#3b82f6',
  'Play\'n GO': '#8b5cf6',
  'Hacksaw': '#ec4899',
  'Push Gaming': '#06b6d4',
  'Relax Gaming': '#84cc16',
  'default': '#6b7280',
}

export function GamesPage() {
  const { range } = useTimeRange()
  const { appliedBrand, appliedCountry } = useFilters()

  const filters = {
    brand: appliedBrand,
    country: appliedCountry,
    timeRange: range,
  }

  const { data: providers, isLoading: providersLoading } = useQuery({
    queryKey: ['game-providers', appliedBrand, appliedCountry, range],
    queryFn: () => mockDataAPI.getGameProviders(filters),
  })

  const { data: timeSeriesData, isLoading: tsLoading } = useQuery({
    queryKey: ['game-timeseries', appliedBrand, appliedCountry, range],
    queryFn: () => mockDataAPI.getGameTimeSeries(filters),
  })

  const isLoading = providersLoading || tsLoading

  // Calculate totals
  const totalLaunches = providers?.reduce((sum, p) => sum + p.launches, 0) ?? 0
  const totalErrors = providers?.reduce((sum, p) => sum + p.errors, 0) ?? 0
  const totalTimeouts = providers?.reduce((sum, p) => sum + p.timeout, 0) ?? 0
  const avgISR = providers?.reduce((sum, p) => sum + p.isr * p.launches, 0) / totalLaunches || 0
  const avgSuccessRate = providers?.reduce((sum, p) => sum + p.successRate * p.launches, 0) / totalLaunches || 0

  const isrTrend = timeSeriesData?.successRate || []

  // ISR status helper
  const getISRStatus = (isr: number): 'good' | 'warning' | 'critical' => {
    if (isr >= 98) return 'good'
    if (isr >= 96) return 'warning'
    return 'critical'
  }

  // Pie chart data for launches distribution
  const pieData = providers?.map(p => ({
    name: p.name,
    value: p.launches,
    color: PROVIDER_COLORS[p.name] || PROVIDER_COLORS.default,
  })) ?? []

  const hasFilters = appliedBrand !== 'All' || appliedCountry !== 'All'
  const filterLabel = [
    appliedBrand !== 'All' ? appliedBrand : null,
    appliedCountry !== 'All' ? appliedCountry : null,
  ].filter(Boolean).join(' • ')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-theme-muted" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {hasFilters && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ background: 'var(--bg-card-blue)' }}>
          <span className="text-sm text-theme-secondary">Filtered by:</span>
          <span className="pill pill-accent text-xs">{filterLabel}</span>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          title="Average ISR"
          value={`${avgISR.toFixed(1)}%`}
          subtitle="Instant Success Rate"
          trend={0.3}
          icon={<Zap size={20} />}
          status={getISRStatus(avgISR)}
          tooltip="Мгновенная успешность — процент игр, запустившихся с первой попытки без retry. Показывает качество интеграции."
          thresholds={{ good: '≥98%', warning: '96-98%', critical: '<96%' }}
        />
        <MetricCard
          title="Launch Success"
          value={`${avgSuccessRate.toFixed(1)}%`}
          subtitle={`${totalLaunches.toLocaleString()} launches`}
          trend={0.5}
          icon={<CheckCircle size={20} />}
          status={avgSuccessRate >= 99 ? 'good' : avgSuccessRate >= 97 ? 'warning' : 'critical'}
          tooltip="Общий процент успешных запусков игр (включая retry)."
          thresholds={{ good: '≥99%', warning: '97-99%', critical: '<97%' }}
        />
        <MetricCard
          title="Total Errors"
          value={totalErrors}
          subtitle={`${totalTimeouts} timeouts`}
          trend={-2.1}
          icon={<XCircle size={20} />}
          status={totalErrors > 100 ? 'critical' : totalErrors > 50 ? 'warning' : 'good'}
          tooltip="Общее количество ошибок запуска игр. Включает ошибки провайдера и таймауты."
          thresholds={{ good: '≤50', warning: '50-100', critical: '>100' }}
        />
        <MetricCard
          title="Providers"
          value={providers?.length ?? 0}
          subtitle="Active integrations"
          icon={<Gamepad2 size={20} />}
          status="neutral"
          tooltip="Количество активных игровых провайдеров, подключённых к платформе."
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* ISR Trend */}
        <Card>
          <SectionHeader title="ISR Trend" subtitle="Instant Success Rate over time" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={isrTrend}>
                <defs>
                  <linearGradient id="isrGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="time"
                  tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  stroke="var(--text-muted)"
                  fontSize={11}
                  axisLine={{ stroke: 'var(--border-color)' }}
                  tickLine={{ stroke: 'var(--border-color)' }}
                />
                <YAxis
                  domain={[94, 100]}
                  stroke="var(--text-muted)"
                  fontSize={11}
                  tickFormatter={(v) => `${v}%`}
                  axisLine={{ stroke: 'var(--border-color)' }}
                  tickLine={{ stroke: 'var(--border-color)' }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="tooltip">
                          <p className="text-xs text-theme-muted">{label ? new Date(label).toLocaleString() : ''}</p>
                          <p className="text-sm font-bold text-theme-primary">{(payload[0].value as number).toFixed(1)}%</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fill="url(#isrGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Launches Distribution */}
        <Card>
          <SectionHeader title="Launches by Provider" subtitle="Distribution" />
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="tooltip">
                          <p className="text-sm font-medium text-theme-primary">{data.name}</p>
                          <p className="text-xs text-theme-muted">{data.value.toLocaleString()} launches</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {pieData.slice(0, 6).map((p) => (
              <div key={p.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                <span className="text-xs text-theme-muted">{p.name}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Provider ISR Table */}
      <Card>
        <SectionHeader
          title="Provider Statistics"
          subtitle="ISR & Performance metrics"
          action={<StatusBadge status={avgISR >= 97 ? 'healthy' : 'degraded'} />}
        />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-theme-muted border-b border-theme">
                <th className="pb-3 font-medium">Provider</th>
                <th className="pb-3 font-medium text-right">Launches</th>
                <th className="pb-3 font-medium">ISR</th>
                <th className="pb-3 font-medium">Success Rate</th>
                <th className="pb-3 font-medium text-right">Errors</th>
                <th className="pb-3 font-medium text-right">Timeouts</th>
                <th className="pb-3 font-medium text-right">Avg Load</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {providers?.sort((a, b) => b.launches - a.launches).map((provider) => {
                const status = provider.isr >= 98 ? 'healthy'
                  : provider.isr >= 96 ? 'degraded'
                  : 'down'

                return (
                  <tr key={provider.name} className="border-b border-theme/50 hover:bg-[var(--bg-card-alt)] transition-colors">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: PROVIDER_COLORS[provider.name] || PROVIDER_COLORS.default }}
                        />
                        <span className="font-medium text-theme-primary">{provider.name}</span>
                      </div>
                    </td>
                    <td className="py-4 text-right text-theme-secondary">
                      {provider.launches.toLocaleString()}
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <ProgressBar
                          value={provider.isr}
                          color={provider.isr >= 98 ? 'emerald' : provider.isr >= 96 ? 'amber' : 'red'}
                          size="sm"
                        />
                        <span className={`text-sm w-14 ${provider.isr >= 98 ? 'text-green-500' : provider.isr >= 96 ? 'text-yellow-500' : 'text-red-500'}`}>
                          {provider.isr.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <ProgressBar
                          value={provider.successRate}
                          color={provider.successRate >= 99 ? 'emerald' : provider.successRate >= 97 ? 'amber' : 'red'}
                          size="sm"
                        />
                        <span className="text-sm text-theme-secondary w-14">
                          {provider.successRate.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-4 text-right">
                      <span className={provider.errors > 20 ? 'text-red-500' : 'text-theme-muted'}>
                        {provider.errors}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <span className={provider.timeout > 15 ? 'text-yellow-500' : 'text-theme-muted'}>
                        {provider.timeout}
                      </span>
                    </td>
                    <td className="py-4 text-right text-theme-secondary">
                      {provider.avgLoadTime.toFixed(1)}s
                    </td>
                    <td className="py-4">
                      <StatusBadge status={status} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ISR by Provider Bar Chart */}
      <Card>
        <SectionHeader title="ISR Comparison" subtitle="Instant Success Rate by provider" />
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={providers?.sort((a, b) => b.isr - a.isr)} layout="vertical">
              <XAxis
                type="number"
                domain={[94, 100]}
                stroke="var(--text-muted)"
                fontSize={11}
                tickFormatter={(v) => `${v}%`}
                axisLine={{ stroke: 'var(--border-color)' }}
                tickLine={{ stroke: 'var(--border-color)' }}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke="var(--text-muted)"
                fontSize={11}
                width={100}
                axisLine={{ stroke: 'var(--border-color)' }}
                tickLine={{ stroke: 'var(--border-color)' }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <div className="tooltip">
                        <p className="text-sm font-medium text-theme-primary">{data.name}</p>
                        <p className="text-xs text-theme-muted">ISR: {data.isr.toFixed(1)}%</p>
                        <p className="text-xs text-theme-muted">Launches: {data.launches.toLocaleString()}</p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar dataKey="isr" radius={[0, 4, 4, 0]}>
                {providers?.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={entry.isr >= 98 ? '#22c55e' : entry.isr >= 96 ? '#f59e0b' : '#ef4444'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="flex items-center gap-4">
          <div className="p-3 rounded-lg" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
            <Zap className="text-[#22c55e]" size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-theme-primary">
              {avgISR.toFixed(1)}%
            </div>
            <div className="text-xs text-theme-muted">Avg ISR</div>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="p-3 rounded-lg" style={{ background: 'rgba(104, 131, 218, 0.1)' }}>
            <TrendingUp style={{ color: 'var(--gradient-7)' }} size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-theme-primary">
              {totalLaunches.toLocaleString()}
            </div>
            <div className="text-xs text-theme-muted">Total Launches</div>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="p-3 rounded-lg" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
            <AlertTriangle className="text-red-500" size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-theme-primary">
              {totalErrors + totalTimeouts}
            </div>
            <div className="text-xs text-theme-muted">Total Issues</div>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="p-3 rounded-lg" style={{ background: 'rgba(248, 175, 8, 0.1)' }}>
            <Clock style={{ color: 'var(--gradient-1)' }} size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-theme-primary">
              {(providers?.reduce((sum, p) => sum + p.avgLoadTime * p.launches, 0) / totalLaunches || 0).toFixed(1)}s
            </div>
            <div className="text-xs text-theme-muted">Avg Load Time</div>
          </div>
        </Card>
      </div>
    </div>
  )
}
