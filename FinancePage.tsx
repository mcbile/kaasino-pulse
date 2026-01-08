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
} from 'recharts'
import { DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight, CreditCard, Loader2 } from 'lucide-react'
import { useTimeRange } from './TimeRangeContext'
import { useFilters } from './App'
import { mockDataAPI } from './apiClient'
import { MetricCard, Card, SectionHeader, ProgressBar } from './ui'

export function FinancePage() {
  const { range, label } = useTimeRange()
  const { appliedBrand, appliedCountry } = useFilters()

  const filters = {
    brand: appliedBrand,
    country: appliedCountry,
    timeRange: range,
  }

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['finance-overview', appliedBrand, appliedCountry, range],
    queryFn: () => mockDataAPI.getOverview(filters),
  })

  const { data: pspData, isLoading: pspLoading } = useQuery({
    queryKey: ['finance-psp', appliedBrand, appliedCountry, range],
    queryFn: () => mockDataAPI.getPSPHealth(filters),
  })

  const { data: sessionsTimeSeries, isLoading: sessionsLoading } = useQuery({
    queryKey: ['finance-sessions-ts', appliedBrand, appliedCountry, range],
    queryFn: () => mockDataAPI.getSessionsTimeSeries(filters),
  })

  const isLoading = overviewLoading || pspLoading || sessionsLoading

  // Use sessions time series for revenue trend (scaled)
  const revenueTrend = sessionsTimeSeries?.map(point => ({
    ...point,
    value: point.value * 40, // Scale to revenue values
  })) || []

  // Create deposits trend from revenue
  const depositsTrend = revenueTrend.map(point => ({
    ...point,
    deposits: point.value * 1.6,
    withdrawals: point.value * 1.04,
  }))

  const CustomTooltip = ({ active, payload, label: tooltipLabel }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="tooltip">
          <p className="text-xs text-theme-muted">{tooltipLabel ? new Date(tooltipLabel).toLocaleString() : ''}</p>
          <p className="text-sm font-bold text-theme-primary">€{payload[0].value.toLocaleString()}</p>
        </div>
      )
    }
    return null
  }

  const hasFilters = appliedBrand !== 'All' || appliedCountry !== 'All'
  const filterLabel = [
    appliedBrand !== 'All' ? appliedBrand : null,
    appliedCountry !== 'All' ? appliedCountry : null,
  ].filter(Boolean).join(' • ')

  // Mock withdrawal data
  const withdrawalsVolume = Math.round((overview?.deposits_volume ?? 0) * 0.65)
  const withdrawalsCount = Math.round((overview?.deposits_count ?? 0) * 0.4)

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

      {/* Key Financial Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          title="GGR Today"
          value={`€${(overview?.ggr_today ?? 0).toLocaleString()}`}
          subtitle={label}
          trend={12.4}
          icon={<DollarSign size={20} />}
          status="good"
          tooltip="Валовый игровой доход (Gross Gaming Revenue) — разница между ставками игроков и выплаченными выигрышами за день."
        />
        <MetricCard
          title="Deposit Volume"
          value={`€${(overview?.deposits_volume ?? 0).toLocaleString()}`}
          subtitle={`${overview?.deposits_count ?? 0} transactions`}
          trend={8.2}
          icon={<ArrowUpRight size={20} />}
          status="good"
          tooltip="Общий объём пополнений счетов игроков за выбранный период."
        />
        <MetricCard
          title="Withdrawal Volume"
          value={`€${withdrawalsVolume.toLocaleString()}`}
          subtitle={`${withdrawalsCount} transactions`}
          trend={-3.5}
          icon={<ArrowDownRight size={20} />}
          status="warning"
          tooltip="Общий объём выводов средств игроками за выбранный период."
        />
        <MetricCard
          title="Net Revenue"
          value={`€${((overview?.deposits_volume ?? 0) - withdrawalsVolume).toLocaleString()}`}
          subtitle="Deposits - Withdrawals"
          trend={15.7}
          icon={<TrendingUp size={20} />}
          status="good"
          tooltip="Чистый денежный поток — разница между пополнениями и выводами. Положительное значение означает приток средств."
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <SectionHeader title="Revenue Trend" subtitle="GGR over time" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrend}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
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
                  stroke="var(--text-muted)"
                  fontSize={11}
                  tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`}
                  axisLine={{ stroke: 'var(--border-color)' }}
                  tickLine={{ stroke: 'var(--border-color)' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <SectionHeader title="Deposits vs Withdrawals" subtitle="Transaction volume" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={depositsTrend}>
                <XAxis
                  dataKey="time"
                  tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  stroke="var(--text-muted)"
                  fontSize={11}
                  axisLine={{ stroke: 'var(--border-color)' }}
                  tickLine={{ stroke: 'var(--border-color)' }}
                />
                <YAxis
                  stroke="var(--text-muted)"
                  fontSize={11}
                  tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`}
                  axisLine={{ stroke: 'var(--border-color)' }}
                  tickLine={{ stroke: 'var(--border-color)' }}
                />
                <Tooltip
                  content={({ active, payload, label: tooltipLabel }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="tooltip">
                          <p className="text-xs text-theme-muted">{tooltipLabel ? new Date(tooltipLabel).toLocaleString() : ''}</p>
                          <p className="text-sm text-green-500">Deposits: €{(payload[0]?.value as number)?.toLocaleString()}</p>
                          <p className="text-sm text-red-500">Withdrawals: €{(payload[1]?.value as number)?.toLocaleString()}</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar dataKey="deposits" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="withdrawals" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* PSP Financial Stats */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <SectionHeader
            title="Payment Providers"
            subtitle="Transaction success rates"
          />
          <div className="space-y-3">
            {pspData?.filter(p => p.operation === 'deposit').map((psp) => {
              const successRate = (psp.success_count / psp.total_count) * 100
              const status = successRate >= 98 ? 'success' : successRate >= 95 ? 'warning' : 'brand'

              return (
                <div key={psp.psp_name} className="flex items-center gap-4">
                  <div className="w-24 text-sm font-medium text-theme-secondary">{psp.psp_name}</div>
                  <div className="flex-1">
                    <ProgressBar
                      value={successRate}
                      color={status === 'success' ? 'emerald' : status === 'warning' ? 'amber' : 'red'}
                      showLabel
                    />
                  </div>
                  <div className="w-16 text-xs text-theme-muted text-right">
                    {psp.total_count} txns
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        <Card>
          <SectionHeader
            title="Transaction Summary"
            subtitle="Today's financial activity"
          />
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--bg-card-alt)' }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <ArrowUpRight className="text-green-500" size={20} />
                </div>
                <div>
                  <div className="text-sm font-medium text-theme-primary">Total Deposits</div>
                  <div className="text-xs text-theme-muted">{overview?.deposits_count ?? 0} transactions</div>
                </div>
              </div>
              <div className="text-xl font-bold text-green-500">€{(overview?.deposits_volume ?? 0).toLocaleString()}</div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--bg-card-alt)' }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/20">
                  <ArrowDownRight className="text-red-500" size={20} />
                </div>
                <div>
                  <div className="text-sm font-medium text-theme-primary">Total Withdrawals</div>
                  <div className="text-xs text-theme-muted">{withdrawalsCount} transactions</div>
                </div>
              </div>
              <div className="text-xl font-bold text-red-500">€{withdrawalsVolume.toLocaleString()}</div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border-2 border-dashed border-theme">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ background: 'rgba(104, 131, 218, 0.2)' }}>
                  <CreditCard style={{ color: 'var(--gradient-7)' }} size={20} />
                </div>
                <div>
                  <div className="text-sm font-medium text-theme-primary">Net Flow</div>
                  <div className="text-xs text-theme-muted">Deposits - Withdrawals</div>
                </div>
              </div>
              <div className="text-xl font-bold" style={{ color: 'var(--gradient-7)' }}>
                €{((overview?.deposits_volume ?? 0) - withdrawalsVolume).toLocaleString()}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* PSP Success Rate Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="flex items-center gap-4">
          <div className="p-3 rounded-lg" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
            <CreditCard className="text-[#22c55e]" size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-theme-primary">
              {overview?.psp_success_rate?.toFixed(1)}%
            </div>
            <div className="text-xs text-theme-muted">PSP Success Rate</div>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="p-3 rounded-lg" style={{ background: 'rgba(248, 175, 8, 0.1)' }}>
            <DollarSign style={{ color: 'var(--gradient-1)' }} size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-theme-primary">
              €{Math.round((overview?.deposits_volume ?? 0) / (overview?.deposits_count || 1)).toLocaleString()}
            </div>
            <div className="text-xs text-theme-muted">Avg Deposit</div>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="p-3 rounded-lg" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
            <ArrowDownRight className="text-red-500" size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-theme-primary">
              €{Math.round(withdrawalsVolume / (withdrawalsCount || 1)).toLocaleString()}
            </div>
            <div className="text-xs text-theme-muted">Avg Withdrawal</div>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="p-3 rounded-lg" style={{ background: 'rgba(104, 131, 218, 0.1)' }}>
            <TrendingUp style={{ color: 'var(--gradient-7)' }} size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-theme-primary">
              {(((overview?.deposits_volume ?? 0) - withdrawalsVolume) / (overview?.deposits_volume || 1) * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-theme-muted">Retention Rate</div>
          </div>
        </Card>
      </div>
    </div>
  )
}
