// Types
export interface Alert {
  id: number
  time: string
  severity: 'critical' | 'warning' | 'info'
  alert_type: string
  message: string
  source_table: string
  threshold_value: number
  actual_value: number
  acknowledged: boolean
  resolved_at?: string
  type?: string // legacy support
}

export interface FilterParams {
  brand?: string
  country?: string
  timeRange?: string
}

export interface PSPHealth {
  name: string
  psp_name: string
  operation: string
  successRate: number
  success_count: number
  total_count: number
  avgLatency: number
  avg_duration_ms: number
  p95_duration_ms: number
  total_amount: number
  volume: number
}

// Simulate network delay (300-800ms)
const simulateDelay = () => new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500))

// Seeded random number generator (deterministic based on seed)
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000
  return x - Math.floor(x)
}

// Create a hash from string for seeding
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

// Get filter key for seeding (same filters = same seed)
function getFilterKey(filters: FilterParams): string {
  return `${filters.brand || 'All'}_${filters.country || 'All'}_${filters.timeRange || '24h'}`
}

// Get multiplier based on filters
function getFilterMultiplier(filters: FilterParams): number {
  let mult = 1

  // Brand multipliers
  if (filters.brand === 'Kaasino') mult *= 1.2
  else if (filters.brand === 'Bet4star') mult *= 0.8

  // Country multipliers
  if (filters.country === 'NL') mult *= 1.15
  else if (filters.country === 'GB') mult *= 0.95
  else if (filters.country === 'DE') mult *= 1.05
  else if (filters.country === 'N/A') mult *= 0.4

  return mult
}

// Get number of points based on time range
function getPointsCount(filters: FilterParams): number {
  if (filters.timeRange === '1h') return 12 // 5min intervals
  if (filters.timeRange === '6h') return 24 // 15min intervals
  if (filters.timeRange === '24h') return 24 // 1h intervals
  if (filters.timeRange === '7d') return 28 // 6h intervals
  if (filters.timeRange === '30d') return 30 // 1d intervals
  return 24
}

// Get interval in ms based on time range
function getIntervalMs(filters: FilterParams): number {
  if (filters.timeRange === '1h') return 300000 // 5 min
  if (filters.timeRange === '6h') return 900000 // 15 min
  if (filters.timeRange === '24h') return 3600000 // 1 hour
  if (filters.timeRange === '7d') return 21600000 // 6 hours
  if (filters.timeRange === '30d') return 86400000 // 1 day
  return 3600000
}

// Round timestamp to interval (for consistent seeding)
function roundToInterval(timestamp: number, intervalMs: number): number {
  return Math.floor(timestamp / intervalMs) * intervalMs
}

// Generate deterministic time series
// - Historical points are fixed (same seed = same value)
// - Last point matches current metric value
function generateTimeSeries(
  metricKey: string,
  baseValue: number,
  variance: number,
  filters: FilterParams,
  currentValue?: number, // Current value to use for the last point
  trend: 'up' | 'down' | 'stable' = 'stable'
): Array<{ time: string; value: number }> {
  const points = getPointsCount(filters)
  const intervalMs = getIntervalMs(filters)
  const filterKey = getFilterKey(filters)
  const mult = getFilterMultiplier(filters)
  const adjustedBase = baseValue * mult

  const now = Date.now()
  const result: Array<{ time: string; value: number }> = []

  for (let i = 0; i < points; i++) {
    const pointTime = now - (points - 1 - i) * intervalMs
    const roundedTime = roundToInterval(pointTime, intervalMs)

    // Create deterministic seed from time + metric + filters
    const seed = hashString(`${metricKey}_${filterKey}_${roundedTime}`)
    const random = seededRandom(seed)

    // Add trend offset
    let trendOffset = 0
    if (trend === 'up') trendOffset = (i / points) * adjustedBase * 0.15
    else if (trend === 'down') trendOffset = -((i / points) * adjustedBase * 0.1)

    // Daily pattern based on hour (deterministic)
    const hour = new Date(roundedTime).getHours()
    const dailyPattern = Math.sin((hour - 6) * Math.PI / 12) * variance * 0.3

    // Calculate value with deterministic variance
    let value = adjustedBase + trendOffset + dailyPattern + (random - 0.5) * variance
    value = Math.max(0, value)

    // Last point uses current value if provided
    if (i === points - 1 && currentValue !== undefined) {
      value = currentValue
    }

    result.push({
      time: new Date(roundedTime).toISOString(),
      value: Math.round(value * 100) / 100, // Round to 2 decimals
    })
  }

  return result
}

// Base mock data (static reference values)
const baseData = {
  overview: {
    activeSessions: 1247,
    active_sessions: 1247,
    avgLatency: 145,
    avg_latency_ms: 145,
    errorRate: 0.34,
    error_rate: 0.34,
    ggr: 24580,
    ggr_today: 24580,
    deposits_count: 156,
    deposits_volume: 45200,
    psp_success_rate: 98.5,
    game_success_rate: 99.2,
  },

  pspHealth: [
    { name: 'PIX', psp_name: 'PIX', operation: 'deposit', successRate: 99.2, success_count: 992, total_count: 1000, avgLatency: 234, avg_duration_ms: 234, p95_duration_ms: 380, total_amount: 125000, volume: 125000 },
    { name: 'Stripe', psp_name: 'Stripe', operation: 'deposit', successRate: 98.8, success_count: 988, total_count: 1000, avgLatency: 312, avg_duration_ms: 312, p95_duration_ms: 520, total_amount: 89000, volume: 89000 },
    { name: 'MuchBetter', psp_name: 'MuchBetter', operation: 'deposit', successRate: 97.5, success_count: 975, total_count: 1000, avgLatency: 445, avg_duration_ms: 445, p95_duration_ms: 780, total_amount: 45600, volume: 45600 },
    { name: 'Skrill', psp_name: 'Skrill', operation: 'deposit', successRate: 99.1, success_count: 991, total_count: 1000, avgLatency: 289, avg_duration_ms: 289, p95_duration_ms: 450, total_amount: 23400, volume: 23400 },
    { name: 'PIX', psp_name: 'PIX', operation: 'withdrawal', successRate: 98.5, success_count: 985, total_count: 1000, avgLatency: 1250, avg_duration_ms: 1250, p95_duration_ms: 2100, total_amount: 78000, volume: 78000 },
    { name: 'Stripe', psp_name: 'Stripe', operation: 'withdrawal', successRate: 97.9, success_count: 979, total_count: 1000, avgLatency: 1890, avg_duration_ms: 1890, p95_duration_ms: 3200, total_amount: 56000, volume: 56000 },
  ] as PSPHealth[],

  apiPerformance: [
    { endpoint: '/api/auth/login', service_name: 'auth', avgDuration: 89, avg_duration_ms: 89, p95_duration_ms: 120, requests: 5420, request_count: 5420, errorRate: 0.1, error_count: 5 },
    { endpoint: '/api/wallet/balance', service_name: 'wallet', avgDuration: 45, avg_duration_ms: 45, p95_duration_ms: 80, requests: 12300, request_count: 12300, errorRate: 0.05, error_count: 6 },
    { endpoint: '/api/games/launch', service_name: 'games', avgDuration: 234, avg_duration_ms: 234, p95_duration_ms: 450, requests: 3200, request_count: 3200, errorRate: 0.8, error_count: 26 },
    { endpoint: '/api/bonus/claim', service_name: 'bonus', avgDuration: 156, avg_duration_ms: 156, p95_duration_ms: 280, requests: 890, request_count: 890, errorRate: 0.3, error_count: 3 },
  ],

  webVitals: {
    lcp: { value: 2.1, rating: 'good' as const },
    fid: { value: 45, rating: 'good' as const },
    cls: { value: 0.08, rating: 'good' as const },
    inp: { value: 180, rating: 'needs-improvement' as const },
    ttfb: { value: 320, rating: 'good' as const },
    fcp: { value: 1.4, rating: 'good' as const },
  },

  gameProviders: [
    { name: 'Pragmatic', successRate: 99.5, avgLoadTime: 1.2, launches: 4500, isr: 98.7, errors: 23, timeout: 12, revenue: 125000 },
    { name: 'Evolution', successRate: 98.9, avgLoadTime: 1.8, launches: 3200, isr: 97.2, errors: 35, timeout: 28, revenue: 98000 },
    { name: 'NetEnt', successRate: 99.2, avgLoadTime: 1.4, launches: 2100, isr: 98.1, errors: 17, timeout: 8, revenue: 67000 },
    { name: 'Play\'n GO', successRate: 99.0, avgLoadTime: 1.5, launches: 1800, isr: 97.8, errors: 18, timeout: 14, revenue: 54000 },
    { name: 'Spribe', successRate: 99.4, avgLoadTime: 1.1, launches: 2800, isr: 99.1, errors: 17, timeout: 5, revenue: 89000 },
    { name: 'Hacksaw', successRate: 98.6, avgLoadTime: 1.6, launches: 1500, isr: 96.8, errors: 21, timeout: 18, revenue: 42000 },
    { name: 'Push Gaming', successRate: 99.1, avgLoadTime: 1.3, launches: 1200, isr: 98.3, errors: 11, timeout: 7, revenue: 38000 },
    { name: 'Relax Gaming', successRate: 98.8, avgLoadTime: 1.7, launches: 950, isr: 97.5, errors: 12, timeout: 10, revenue: 31000 },
  ],

  gameHealth: [
    { provider: 'Pragmatic', game_type: 'slots', launch_count: 3500, success_count: 3483, avg_load_time_ms: 1200, p95_load_time_ms: 2100 },
    { provider: 'Pragmatic', game_type: 'live', launch_count: 1000, success_count: 995, avg_load_time_ms: 1800, p95_load_time_ms: 2800 },
    { provider: 'Evolution', game_type: 'live', launch_count: 3200, success_count: 3165, avg_load_time_ms: 1800, p95_load_time_ms: 3200 },
    { provider: 'NetEnt', game_type: 'slots', launch_count: 2100, success_count: 2083, avg_load_time_ms: 1400, p95_load_time_ms: 2400 },
    { provider: 'Spribe', game_type: 'crash', launch_count: 2800, success_count: 2783, avg_load_time_ms: 1100, p95_load_time_ms: 1800 },
  ],

  alerts: [
    {
      id: 1,
      time: new Date(Date.now() - 5 * 60000).toISOString(),
      severity: 'warning' as const,
      alert_type: 'psp_latency_high',
      message: 'PSP MuchBetter latency increased by 25%',
      source_table: 'psp_transactions',
      threshold_value: 300,
      actual_value: 445,
      acknowledged: false,
      type: 'warning',
    },
    {
      id: 2,
      time: new Date(Date.now() - 12 * 60000).toISOString(),
      severity: 'critical' as const,
      alert_type: 'game_error_spike',
      message: 'Game provider Pragmatic error rate spike',
      source_table: 'game_launches',
      threshold_value: 1,
      actual_value: 2.5,
      acknowledged: false,
      type: 'critical',
    },
    {
      id: 3,
      time: new Date(Date.now() - 30 * 60000).toISOString(),
      severity: 'info' as const,
      alert_type: 'scheduled_maintenance',
      message: 'Scheduled maintenance in 2 hours',
      source_table: 'system_events',
      threshold_value: 0,
      actual_value: 0,
      acknowledged: true,
      type: 'info',
    },
  ] as Alert[],
}

// Calculate current metrics based on filters (deterministic)
function getCurrentMetrics(filters: FilterParams) {
  const mult = getFilterMultiplier(filters)
  const filterKey = getFilterKey(filters)

  // Use current hour for "live" variance (changes hourly, not per request)
  const currentHour = Math.floor(Date.now() / 3600000)
  const seed = hashString(`current_${filterKey}_${currentHour}`)
  const random = seededRandom(seed)

  return {
    activeSessions: Math.round(baseData.overview.activeSessions * mult * (0.95 + random * 0.1)),
    avgLatency: Math.round(baseData.overview.avgLatency * (0.9 + random * 0.2)),
    errorRate: Math.round((baseData.overview.errorRate * (0.8 + random * 0.4)) * 100) / 100,
    ggr: Math.round(baseData.overview.ggr * mult),
    deposits_count: Math.round(baseData.overview.deposits_count * mult),
    deposits_volume: Math.round(baseData.overview.deposits_volume * mult),
    psp_success_rate: Math.round((98 + random * 2) * 10) / 10,
    game_success_rate: Math.round((98.5 + random * 1.5) * 10) / 10,
  }
}

// Mock data API functions with filters and delay
export const mockDataAPI = {
  // Overview data
  async getOverview(filters: FilterParams) {
    await simulateDelay()
    const current = getCurrentMetrics(filters)
    return {
      ...baseData.overview,
      active_sessions: current.activeSessions,
      activeSessions: current.activeSessions,
      avg_latency_ms: current.avgLatency,
      avgLatency: current.avgLatency,
      error_rate: current.errorRate,
      errorRate: current.errorRate,
      ggr_today: current.ggr,
      ggr: current.ggr,
      deposits_count: current.deposits_count,
      deposits_volume: current.deposits_volume,
      psp_success_rate: current.psp_success_rate,
      game_success_rate: current.game_success_rate,
    }
  },

  // PSP Health
  async getPSPHealth(filters: FilterParams) {
    await simulateDelay()
    const mult = getFilterMultiplier(filters)
    const filterKey = getFilterKey(filters)
    const currentHour = Math.floor(Date.now() / 3600000)

    return baseData.pspHealth.map((psp, idx) => {
      const seed = hashString(`psp_${psp.psp_name}_${psp.operation}_${filterKey}_${currentHour}`)
      const random = seededRandom(seed)

      const totalCount = Math.round(psp.total_count * mult)
      const successRate = Math.round((psp.successRate * (0.98 + random * 0.04)) * 10) / 10
      const successCount = Math.round(totalCount * successRate / 100)

      return {
        ...psp,
        volume: Math.round(psp.volume * mult),
        total_amount: Math.round(psp.total_amount * mult),
        total_count: totalCount,
        success_count: successCount,
        successRate,
        avgLatency: Math.round(psp.avgLatency * (0.9 + random * 0.2)),
        avg_duration_ms: Math.round(psp.avg_duration_ms * (0.9 + random * 0.2)),
      }
    })
  },

  // PSP Time Series - correlates with current PSP health
  async getPSPTimeSeries(filters: FilterParams) {
    await simulateDelay()
    const pspHealth = await this.getPSPHealth(filters)

    // Find current values for each PSP
    const pixDeposit = pspHealth.find(p => p.psp_name === 'PIX' && p.operation === 'deposit')
    const stripeDeposit = pspHealth.find(p => p.psp_name === 'Stripe' && p.operation === 'deposit')
    const muchbetterDeposit = pspHealth.find(p => p.psp_name === 'MuchBetter' && p.operation === 'deposit')
    const skrillDeposit = pspHealth.find(p => p.psp_name === 'Skrill' && p.operation === 'deposit')

    return {
      pix: generateTimeSeries('psp_pix', 99.2, 2, filters, pixDeposit?.successRate, 'stable'),
      stripe: generateTimeSeries('psp_stripe', 98.8, 2.5, filters, stripeDeposit?.successRate, 'up'),
      muchbetter: generateTimeSeries('psp_muchbetter', 97.5, 3, filters, muchbetterDeposit?.successRate, 'stable'),
      skrill: generateTimeSeries('psp_skrill', 99.1, 2, filters, skrillDeposit?.successRate, 'stable'),
    }
  },

  // API Performance
  async getAPIPerformance(filters: FilterParams) {
    await simulateDelay()
    const mult = getFilterMultiplier(filters)
    const filterKey = getFilterKey(filters)
    const currentHour = Math.floor(Date.now() / 3600000)

    return baseData.apiPerformance.map(api => {
      const seed = hashString(`api_${api.endpoint}_${filterKey}_${currentHour}`)
      const random = seededRandom(seed)

      const requestCount = Math.round(api.request_count * mult)
      const avgDuration = Math.round(api.avg_duration_ms * (0.85 + random * 0.3))

      return {
        ...api,
        request_count: requestCount,
        requests: requestCount,
        error_count: Math.round(api.error_count * mult * (0.8 + random * 0.4)),
        avg_duration_ms: avgDuration,
        avgDuration: avgDuration,
        p95_duration_ms: Math.round(api.p95_duration_ms * (0.85 + random * 0.3)),
      }
    })
  },

  // API Time Series - correlates with current API performance
  async getAPITimeSeries(filters: FilterParams) {
    await simulateDelay()
    const current = getCurrentMetrics(filters)

    return {
      latency: generateTimeSeries('api_latency', 145, 30, filters, current.avgLatency, 'stable'),
      requests: generateTimeSeries('api_requests', 5000, 1500, filters, undefined, 'up'),
      errors: generateTimeSeries('api_errors', 15, 8, filters, undefined, 'stable'),
    }
  },

  // Web Vitals
  async getWebVitals(filters: FilterParams) {
    await simulateDelay()
    const filterKey = getFilterKey(filters)
    const currentHour = Math.floor(Date.now() / 3600000)
    const seed = hashString(`vitals_${filterKey}_${currentHour}`)
    const random = seededRandom(seed)

    return {
      lcp: { value: Math.round((2.1 + (random - 0.5) * 0.4) * 100) / 100, rating: 'good' as const },
      fid: { value: Math.round(45 + (random - 0.5) * 20), rating: 'good' as const },
      cls: { value: Math.round((0.08 + (random - 0.5) * 0.04) * 1000) / 1000, rating: 'good' as const },
      inp: { value: Math.round(180 + (random - 0.5) * 40), rating: 'needs-improvement' as const },
      ttfb: { value: Math.round(320 + (random - 0.5) * 80), rating: 'good' as const },
      fcp: { value: Math.round((1.4 + (random - 0.5) * 0.3) * 100) / 100, rating: 'good' as const },
    }
  },

  // Web Vitals Time Series - correlates with current vitals
  async getWebVitalsTimeSeries(filters: FilterParams) {
    await simulateDelay()
    const vitals = await this.getWebVitals(filters)

    return {
      lcp: generateTimeSeries('vitals_lcp', 2.1, 0.5, filters, vitals.lcp.value, 'down'),
      fid: generateTimeSeries('vitals_fid', 45, 15, filters, vitals.fid.value, 'stable'),
      cls: generateTimeSeries('vitals_cls', 0.08, 0.03, filters, vitals.cls.value, 'stable'),
      inp: generateTimeSeries('vitals_inp', 180, 40, filters, vitals.inp.value, 'down'),
      ttfb: generateTimeSeries('vitals_ttfb', 320, 60, filters, vitals.ttfb.value, 'stable'),
      fcp: generateTimeSeries('vitals_fcp', 1.4, 0.3, filters, vitals.fcp.value, 'down'),
    }
  },

  // Game Providers
  async getGameProviders(filters: FilterParams) {
    await simulateDelay()
    const mult = getFilterMultiplier(filters)
    const filterKey = getFilterKey(filters)
    const currentHour = Math.floor(Date.now() / 3600000)

    return baseData.gameProviders.map(game => {
      const seed = hashString(`game_${game.name}_${filterKey}_${currentHour}`)
      const random = seededRandom(seed)

      return {
        ...game,
        launches: Math.round(game.launches * mult),
        errors: Math.round(game.errors * mult * (0.8 + random * 0.4)),
        timeout: Math.round(game.timeout * mult * (0.8 + random * 0.4)),
        revenue: Math.round(game.revenue * mult),
        successRate: Math.round((game.successRate * (0.995 + random * 0.01)) * 10) / 10,
        avgLoadTime: Math.round((game.avgLoadTime * (0.9 + random * 0.2)) * 100) / 100,
      }
    })
  },

  // Game Health
  async getGameHealth(filters: FilterParams) {
    await simulateDelay()
    const mult = getFilterMultiplier(filters)
    const filterKey = getFilterKey(filters)
    const currentHour = Math.floor(Date.now() / 3600000)

    return baseData.gameHealth.map(game => {
      const seed = hashString(`game_health_${game.provider}_${game.game_type}_${filterKey}_${currentHour}`)
      const random = seededRandom(seed)

      const launchCount = Math.round(game.launch_count * mult)
      const successRate = 0.99 + random * 0.01

      return {
        ...game,
        launch_count: launchCount,
        success_count: Math.round(launchCount * successRate),
        avg_load_time_ms: Math.round(game.avg_load_time_ms * (0.9 + random * 0.2)),
        p95_load_time_ms: Math.round(game.p95_load_time_ms * (0.9 + random * 0.2)),
      }
    })
  },

  // Game Time Series - correlates with game providers
  async getGameTimeSeries(filters: FilterParams) {
    await simulateDelay()
    const current = getCurrentMetrics(filters)
    const games = await this.getGameProviders(filters)
    const avgLoadTime = games.reduce((sum, g) => sum + g.avgLoadTime, 0) / games.length

    return {
      successRate: generateTimeSeries('game_success', 99, 1.5, filters, current.game_success_rate, 'stable'),
      loadTime: generateTimeSeries('game_loadtime', 1.4, 0.3, filters, avgLoadTime, 'down'),
      launches: generateTimeSeries('game_launches', 2500, 800, filters, undefined, 'up'),
    }
  },

  // Alerts
  async getAlerts(filters: FilterParams) {
    await simulateDelay()
    // Filter alerts based on time range
    const now = Date.now()
    let maxAge = 24 * 60 * 60 * 1000 // 24h default
    if (filters.timeRange === '1h') maxAge = 60 * 60 * 1000
    else if (filters.timeRange === '6h') maxAge = 6 * 60 * 60 * 1000
    else if (filters.timeRange === '7d') maxAge = 7 * 24 * 60 * 60 * 1000
    else if (filters.timeRange === '30d') maxAge = 30 * 24 * 60 * 60 * 1000

    return baseData.alerts.filter(alert => {
      const alertTime = new Date(alert.time).getTime()
      return now - alertTime <= maxAge
    })
  },

  // Sessions Time Series - correlates with overview
  async getSessionsTimeSeries(filters: FilterParams) {
    await simulateDelay()
    const current = getCurrentMetrics(filters)
    return generateTimeSeries('sessions', 1200, 300, filters, current.activeSessions, 'up')
  },

  // Latency Time Series - correlates with overview
  async getLatencyTimeSeries(filters: FilterParams) {
    await simulateDelay()
    const current = getCurrentMetrics(filters)
    return generateTimeSeries('latency', 145, 30, filters, current.avgLatency, 'stable')
  },
}

// Legacy mockData export for backward compatibility
export const mockData = {
  ...baseData,
  generateTimeSeries: (points: number, baseValue: number, variance: number) => {
    const result: Array<{ time: string; value: number }> = []
    const now = Date.now()
    const intervalMs = 3600000

    for (let i = 0; i < points; i++) {
      const pointTime = now - (points - 1 - i) * intervalMs
      const seed = hashString(`legacy_${pointTime}`)
      const random = seededRandom(seed)

      result.push({
        time: new Date(pointTime).toISOString(),
        value: Math.round((baseValue + (random - 0.5) * variance) * 100) / 100,
      })
    }
    return result
  },
}

// API client for production
export async function fetchMetrics(endpoint: string, params?: Record<string, string>) {
  const url = new URL(`/api${endpoint}`, window.location.origin)
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}
