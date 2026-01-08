import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { CreditCard, TrendingUp, Clock, AlertTriangle, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { useTimeRange } from './TimeRangeContext'
import { useFilters } from './App'
import { mockDataAPI, PSPHealth } from './apiClient'
import { MetricCard, Card, SectionHeader, StatusBadge, ProgressBar } from './ui'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
const FAILED_ITEMS_COLLAPSED = 3

export function PSPPage() {
  const [showAllFailed, setShowAllFailed] = useState(false)
  const { range } = useTimeRange()
  const { appliedBrand, appliedCountry } = useFilters()

  const filters = {
    brand: appliedBrand,
    country: appliedCountry,
    timeRange: range,
  }

  const { data: pspData, isLoading: pspLoading } = useQuery({
    queryKey: ['psp-health', appliedBrand, appliedCountry, range],
    queryFn: () => mockDataAPI.getPSPHealth(filters),
  })

  const { data: timeSeriesData, isLoading: tsLoading } = useQuery({
    queryKey: ['psp-timeseries', appliedBrand, appliedCountry, range],
    queryFn: () => mockDataAPI.getPSPTimeSeries(filters),
  })

  const isLoading = pspLoading || tsLoading

  // Totals
  const deposits = pspData?.filter(p => p.operation === 'deposit') ?? []
  const totalDeposits = deposits.reduce((sum, p) => sum + p.total_count, 0)
  const successfulDeposits = deposits.reduce((sum, p) => sum + p.success_count, 0)
  const totalVolume = deposits.reduce((sum, p) => sum + p.total_amount, 0)
  const avgLatency = deposits.reduce((sum, p) => sum + p.avg_duration_ms * p.total_count, 0) / totalDeposits || 0

  const depositSuccessRate = (successfulDeposits / totalDeposits) * 100 || 0

  // Combined success rate from all PSPs for chart
  const successTrend = timeSeriesData?.pix || []

  // Pie chart data
  const volumeByPSP = deposits.map((p, i) => ({
    name: p.psp_name,
    value: p.total_amount,
    color: COLORS[i % COLORS.length],
  }))

  const getSuccessStatus = (rate: number) => {
    if (rate >= 98) return 'healthy'
    if (rate >= 95) return 'degraded'
    return 'down'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-theme-muted" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          title="Success Rate"
          value={`${depositSuccessRate.toFixed(1)}%`}
          subtitle="All PSPs combined"
          trend={0.5}
          icon={<TrendingUp size={20} />}
          status={depositSuccessRate >= 98 ? 'good' : depositSuccessRate >= 95 ? 'warning' : 'critical'}
          tooltip="Процент успешно завершённых платёжных транзакций по всем провайдерам."
          thresholds={{ good: '≥98%', warning: '95-98%', critical: '<95%' }}
        />
        <MetricCard
          title="Total Volume"
          value={`$${totalVolume.toLocaleString()}`}
          subtitle={`${totalDeposits} transactions`}
          trend={12.3}
          icon={<CreditCard size={20} />}
          status="good"
          tooltip="Общий объём платежей в долларах за выбранный период."
        />
        <MetricCard
          title="Avg Latency"
          value={`${avgLatency.toFixed(0)}ms`}
          subtitle="Time to confirm"
          trend={-5.2}
          icon={<Clock size={20} />}
          status={avgLatency < 2000 ? 'good' : avgLatency < 5000 ? 'warning' : 'critical'}
          tooltip="Среднее время от инициации платежа до подтверждения провайдером."
          thresholds={{ good: '<2s', warning: '2-5s', critical: '>5s' }}
        />
        <MetricCard
          title="Failed Txns"
          value={totalDeposits - successfulDeposits}
          subtitle="Requires attention"
          icon={<AlertTriangle size={20} />}
          status={totalDeposits - successfulDeposits > 10 ? 'warning' : 'good'}
          tooltip="Количество неуспешных транзакций, требующих анализа причин отказа."
          thresholds={{ good: '≤10', warning: '10-50', critical: '>50' }}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* Success Rate Trend */}
        <Card>
          <SectionHeader title="Success Rate Trend" subtitle="PIX deposits (%)" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={successTrend}>
                <defs>
                  <linearGradient id="successGradient" x1="0" y1="0" x2="0" y2="1">
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
                <YAxis stroke="#6b7280" fontSize={11} domain={[90, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                  }}
                  labelFormatter={(t) => new Date(t).toLocaleString()}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Success Rate']}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#successGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Volume Distribution */}
        <Card>
          <SectionHeader title="Volume by PSP" subtitle="Deposit distribution" />
          <div className="h-64 flex items-center">
            <ResponsiveContainer width="50%" height="100%">
              <PieChart>
                <Pie
                  data={volumeByPSP}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {volumeByPSP.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Volume']}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {volumeByPSP.map((p) => (
                <div key={p.name} className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="text-sm text-theme-secondary">{p.name}</span>
                  <span className="text-sm text-theme-muted ml-auto">
                    ${p.value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* PSP Table */}
      <Card>
        <SectionHeader title="PSP Performance" subtitle="Detailed breakdown by provider" />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-theme-muted border-b border-theme">
                <th className="pb-3 font-medium">Provider</th>
                <th className="pb-3 font-medium">Operation</th>
                <th className="pb-3 font-medium">Transactions</th>
                <th className="pb-3 font-medium">Success Rate</th>
                <th className="pb-3 font-medium">Avg Latency</th>
                <th className="pb-3 font-medium">P95 Latency</th>
                <th className="pb-3 font-medium">Volume</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {pspData?.map((psp) => {
                const successRate = (psp.success_count / psp.total_count) * 100

                return (
                  <tr key={`${psp.psp_name}-${psp.operation}`} className="border-b border-theme">
                    <td className="py-4">
                      <span className="font-medium text-theme-primary">{psp.psp_name}</span>
                    </td>
                    <td className="py-4">
                      <span className={`
                        px-2 py-1 text-xs rounded-full
                        ${psp.operation === 'deposit'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-blue-500/10 text-blue-500'
                        }
                      `}>
                        {psp.operation}
                      </span>
                    </td>
                    <td className="py-4 text-theme-secondary">
                      {psp.total_count.toLocaleString()}
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <ProgressBar
                          value={successRate}
                          color={successRate >= 98 ? 'emerald' : successRate >= 95 ? 'amber' : 'red'}
                          size="sm"
                        />
                        <span className="text-sm text-theme-primary w-14">
                          {successRate.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-4 text-theme-secondary">
                      {psp.avg_duration_ms.toFixed(0)}ms
                    </td>
                    <td className="py-4 text-theme-secondary">
                      {psp.p95_duration_ms.toFixed(0)}ms
                    </td>
                    <td className="py-4 text-theme-primary">
                      ${psp.total_amount.toLocaleString()}
                    </td>
                    <td className="py-4">
                      <StatusBadge status={getSuccessStatus(successRate)} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Failed Transactions */}
      <Card>
        {(() => {
          const failedItems = pspData?.filter(p => p.total_count - p.success_count > 0) || []
          const hasMore = failedItems.length > FAILED_ITEMS_COLLAPSED
          const displayItems = showAllFailed ? failedItems : failedItems.slice(0, FAILED_ITEMS_COLLAPSED)

          return (
            <>
              <SectionHeader
                title="Failed Transactions"
                subtitle="Recent failures by PSP"
                action={hasMore ? (
                  <button
                    onClick={() => setShowAllFailed(!showAllFailed)}
                    className="text-xs text-emerald-500 hover:text-emerald-400 flex items-center gap-1"
                  >
                    {showAllFailed ? (
                      <>Show less <ChevronUp size={14} /></>
                    ) : (
                      <>View all ({failedItems.length}) <ChevronDown size={14} /></>
                    )}
                  </button>
                ) : undefined}
              />
              <div className="space-y-3">
                {displayItems.map((psp) => {
                  const failed = psp.total_count - psp.success_count
                  return (
                    <div key={`${psp.psp_name}-${psp.operation}-failed`} className="flex items-center gap-4 p-3 rounded-lg" style={{ background: 'var(--bg-card-alt)' }}>
                      <div className="p-2 bg-red-500/10 rounded-lg">
                        <AlertTriangle className="text-red-500" size={18} />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-theme-primary">
                          {psp.psp_name} - {psp.operation}
                        </div>
                        <div className="text-xs text-theme-muted">
                          {failed} failed of {psp.total_count} transactions
                        </div>
                      </div>
                      <div className="text-sm text-red-400">
                        {((failed / psp.total_count) * 100).toFixed(1)}% failure
                      </div>
                    </div>
                  )
                })}
                {failedItems.length === 0 && (
                  <div className="text-center py-4 text-theme-muted text-sm">
                    No failed transactions
                  </div>
                )}
              </div>
            </>
          )
        })()}
      </Card>
    </div>
  )
}
