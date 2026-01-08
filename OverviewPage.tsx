import { useQuery } from '@tanstack/react-query'
import { Users, Activity, AlertTriangle, Clock, DollarSign, CreditCard, Gamepad2, Server, TrendingUp, TrendingDown } from 'lucide-react'
import { useTimeRange } from './TimeRangeContext'
import { useFilters } from './App'
import { useAuth } from './AuthContext'
import { mockData } from './apiClient'
import { MetricCard, Card, SectionHeader, StatusBadge } from './ui'

// Helper to get client permissions
function getClientPermissions(email: string) {
  try {
    const allPermissions = JSON.parse(localStorage.getItem('pulse-client-permissions') || '{}')
    return allPermissions[email.toLowerCase()] || { finance: false, psp: false }
  } catch {
    return { finance: false, psp: false }
  }
}

export function OverviewPage() {
  const { getStartTime, label } = useTimeRange()
  const { appliedBrand, appliedCountry } = useFilters()
  const { user } = useAuth()

  // Determine access rights
  const isSuperAdmin = user?.role === 'super_admin'
  const isAdmin = user?.role === 'admin' || isSuperAdmin
  const permissions = user ? getClientPermissions(user.email) : { finance: false, psp: false }
  // Super admin always sees everything
  const canSeeFinance = isSuperAdmin || isAdmin || permissions.finance
  const canSeePSP = isSuperAdmin || isAdmin || permissions.psp

  // Generate data based on applied filters
  const getFilterMultiplier = () => {
    let mult = 1
    if (appliedBrand === 'Kaasino') mult *= 1.2
    if (appliedBrand === 'Bet4star') mult *= 0.8
    if (appliedCountry === 'NL') mult *= 1.1
    if (appliedCountry === 'GB') mult *= 0.9
    if (appliedCountry === 'DE') mult *= 1.0
    if (appliedCountry === 'N/A') mult *= 0.5
    return mult
  }

  const filterMult = getFilterMultiplier()

  // In production, replace mockData with actual API calls
  const { data: overview } = useQuery({
    queryKey: ['overview', getStartTime().toISOString(), appliedBrand, appliedCountry],
    queryFn: () => Promise.resolve({
      ...mockData.overview,
      active_sessions: Math.round(mockData.overview.active_sessions * filterMult),
      ggr_today: Math.round(mockData.overview.ggr_today * filterMult),
      deposits_count: Math.round(mockData.overview.deposits_count * filterMult),
      deposits_volume: Math.round(mockData.overview.deposits_volume * filterMult),
    }),
  })

  const { data: apiData } = useQuery({
    queryKey: ['api-overview', getStartTime().toISOString(), appliedBrand, appliedCountry],
    queryFn: () => Promise.resolve(mockData.apiPerformance),
  })

  const { data: pspData } = useQuery({
    queryKey: ['psp-overview', getStartTime().toISOString(), appliedBrand, appliedCountry],
    queryFn: () => Promise.resolve(mockData.pspHealth),
  })

  const { data: gameData } = useQuery({
    queryKey: ['game-overview', getStartTime().toISOString(), appliedBrand, appliedCountry],
    queryFn: () => Promise.resolve(mockData.gameProviders),
  })

  const getLatencyStatus = (ms: number): 'good' | 'warning' | 'critical' => {
    if (ms < 200) return 'good'
    if (ms < 500) return 'warning'
    return 'critical'
  }

  const getErrorStatus = (rate: number): 'good' | 'warning' | 'critical' => {
    if (rate < 0.5) return 'good'
    if (rate < 2) return 'warning'
    return 'critical'
  }

  const getSuccessStatus = (rate: number): 'good' | 'warning' | 'critical' => {
    if (rate >= 99) return 'good'
    if (rate >= 95) return 'warning'
    return 'critical'
  }

  // Active filters indicator
  const hasFilters = appliedBrand !== 'All' || appliedCountry !== 'All'
  const filterLabel = [
    appliedBrand !== 'All' ? appliedBrand : null,
    appliedCountry !== 'All' ? appliedCountry : null,
  ].filter(Boolean).join(' • ')

  // Calculate totals
  const totalRequests = apiData?.reduce((sum, a) => sum + a.request_count, 0) ?? 0
  const avgPSPSuccess = pspData?.reduce((sum, p) => sum + p.successRate, 0) / (pspData?.length || 1)
  const avgGameSuccess = gameData?.reduce((sum, g) => sum + g.successRate, 0) / (gameData?.length || 1)

  return (
    <div className="space-y-6">
      {/* Active Filters Banner */}
      {hasFilters && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ background: 'var(--bg-card-blue)' }}>
          <span className="text-sm text-theme-secondary">Filtered by:</span>
          <span className="pill pill-accent text-xs">{filterLabel}</span>
        </div>
      )}

      {/* Key Metrics - Always visible */}
      <div>
        <SectionHeader title="System Health" subtitle="Core performance metrics" />
        <div className="grid grid-cols-4 gap-4 mt-4">
          <MetricCard
            title="Active Sessions"
            value={overview?.active_sessions?.toLocaleString() ?? '-'}
            subtitle={label}
            trend={5.2}
            icon={<Users size={20} />}
            status="good"
            tooltip="Количество активных пользовательских сессий в данный момент"
          />
          <MetricCard
            title="Avg Latency"
            value={`${overview?.avg_latency_ms ?? 0}ms`}
            subtitle="p95 across services"
            trend={-3.1}
            icon={<Activity size={20} />}
            status={getLatencyStatus(overview?.avg_latency_ms ?? 0)}
            tooltip="Среднее время ответа API (95-й персентиль). Показывает задержку для 95% всех запросов."
            thresholds={{ good: '<200ms', warning: '200-500ms', critical: '>500ms' }}
          />
          <MetricCard
            title="Error Rate"
            value={`${overview?.error_rate ?? 0}%`}
            subtitle="5xx errors"
            trend={0.8}
            icon={<AlertTriangle size={20} />}
            status={getErrorStatus(overview?.error_rate ?? 0)}
            tooltip="Процент серверных ошибок (5xx) от общего числа запросов."
            thresholds={{ good: '<0.5%', warning: '0.5-2%', critical: '>2%' }}
          />
          <MetricCard
            title="Uptime"
            value="99.97%"
            subtitle="Last 30 days"
            trend={0.02}
            icon={<Clock size={20} />}
            status="good"
            tooltip="Процент времени, когда система была доступна за последние 30 дней."
            thresholds={{ good: '>99.9%', warning: '99-99.9%', critical: '<99%' }}
          />
        </div>
      </div>

      {/* Quick Stats */}
      <div>
        <SectionHeader title="Quick Stats" subtitle="Today's summary" />
        <div className="grid grid-cols-4 gap-4 mt-4">
          <Card className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
              <Server className="text-green-500" size={24} />
            </div>
            <div>
              <div className="text-2xl font-bold text-theme-primary">
                {apiData?.length ?? 0}
              </div>
              <div className="text-xs text-theme-muted">Active Services</div>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg" style={{ background: 'rgba(104, 131, 218, 0.1)' }}>
              <Gamepad2 style={{ color: 'var(--gradient-7)' }} size={24} />
            </div>
            <div>
              <div className="text-2xl font-bold text-theme-primary">
                {avgGameSuccess?.toFixed(1)}%
              </div>
              <div className="text-xs text-theme-muted">Game Success Rate</div>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg" style={{ background: 'rgba(248, 175, 8, 0.1)' }}>
              <Users style={{ color: 'var(--gradient-1)' }} size={24} />
            </div>
            <div>
              <div className="text-2xl font-bold text-theme-primary">
                {overview?.active_sessions?.toLocaleString() ?? 0}
              </div>
              <div className="text-xs text-theme-muted">Peak Sessions</div>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg" style={{ background: 'rgba(194, 75, 157, 0.1)' }}>
              <Activity style={{ color: 'var(--gradient-5)' }} size={24} />
            </div>
            <div>
              <div className="text-2xl font-bold text-theme-primary">
                {Math.round(totalRequests / 1000)}k
              </div>
              <div className="text-xs text-theme-muted">Requests Today</div>
            </div>
          </Card>
        </div>
      </div>

      {/* PSP Metrics - Role restricted */}
      {canSeePSP && (
        <div>
          <SectionHeader title="Payment Providers" subtitle="PSP health overview" />
          <div className="grid grid-cols-4 gap-4 mt-4">
            <MetricCard
              title="PSP Success Rate"
              value={`${avgPSPSuccess?.toFixed(1) ?? 0}%`}
              subtitle="Average across providers"
              trend={1.2}
              icon={<CreditCard size={20} />}
              status={getSuccessStatus(avgPSPSuccess)}
              tooltip="Средний процент успешных платёжных транзакций по всем провайдерам."
              thresholds={{ good: '>99%', warning: '95-99%', critical: '<95%' }}
            />
            {pspData?.slice(0, 3).map((psp) => (
              <Card key={psp.psp_name} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-theme-primary">{psp.psp_name}</span>
                  <StatusBadge status={psp.successRate >= 99 ? 'healthy' : psp.successRate >= 95 ? 'degraded' : 'down'} />
                </div>
                <div className="text-2xl font-bold text-theme-primary">{psp.successRate}%</div>
                <div className="text-xs text-theme-muted mt-1">{psp.avgLatency}ms avg latency</div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Games & API - Always visible */}
      <div className="grid grid-cols-2 gap-6">
        {/* Games Summary */}
        <div>
          <SectionHeader title="Game Providers" subtitle="Launch success rates" />
          <Card className="p-4 mt-4">
            <div className="space-y-3">
              {gameData?.slice(0, 5).map((game) => (
                <div key={game.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg" style={{ background: 'rgba(104, 131, 218, 0.1)' }}>
                      <Gamepad2 size={16} style={{ color: 'var(--gradient-7)' }} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-theme-primary">{game.name}</div>
                      <div className="text-xs text-theme-muted">{game.launches.toLocaleString()} launches</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${game.successRate >= 99 ? 'text-green-500' : game.successRate >= 95 ? 'text-yellow-500' : 'text-red-500'}`}>
                      {game.successRate}%
                    </div>
                    <div className="text-xs text-theme-muted">{game.avgLoadTime}s load</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* API Summary */}
        <div>
          <SectionHeader title="API Services" subtitle="Endpoint health" />
          <Card className="p-4 mt-4">
            <div className="space-y-3">
              {apiData?.map((api) => {
                const errorRate = (api.error_count / api.request_count) * 100
                return (
                  <div key={`${api.service_name}-${api.endpoint}`} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
                        <Server size={16} className="text-green-500" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-theme-primary capitalize">{api.service_name}</div>
                        <div className="text-xs text-theme-muted truncate max-w-[150px]">{api.endpoint}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-theme-primary">{api.avg_duration_ms}ms</div>
                      <div className={`text-xs ${errorRate > 1 ? 'text-red-500' : 'text-theme-muted'}`}>
                        {errorRate.toFixed(2)}% err
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      </div>

      {/* Finance Metrics - Role restricted - at the bottom */}
      {canSeeFinance && (
        <div>
          <SectionHeader title="Finance" subtitle="Revenue and transactions" />
          <div className="grid grid-cols-4 gap-4 mt-4">
            <MetricCard
              title="GGR Today"
              value={`€${(overview?.ggr_today ?? 0).toLocaleString()}`}
              subtitle="Gross Gaming Revenue"
              trend={12.5}
              icon={<DollarSign size={20} />}
              status="good"
              tooltip="Валовый игровой доход — разница между ставками игроков и выплаченными выигрышами."
            />
            <MetricCard
              title="Deposits"
              value={overview?.deposits_count?.toString() ?? '0'}
              subtitle={`€${(overview?.deposits_volume ?? 0).toLocaleString()} volume`}
              trend={8.3}
              icon={<TrendingUp size={20} />}
              status="good"
              tooltip="Количество и объём пополнений счетов за выбранный период."
            />
            <MetricCard
              title="Withdrawals"
              value="89"
              subtitle="€32,100 volume"
              trend={-2.1}
              icon={<TrendingDown size={20} />}
              status="good"
              tooltip="Количество и объём выводов средств за выбранный период."
            />
            <MetricCard
              title="Net Revenue"
              value="€18,200"
              subtitle="After payouts"
              trend={15.2}
              icon={<DollarSign size={20} />}
              status="good"
              tooltip="Чистый доход после всех выплат (GGR минус бонусы и комиссии)."
            />
          </div>
        </div>
      )}
    </div>
  )
}
