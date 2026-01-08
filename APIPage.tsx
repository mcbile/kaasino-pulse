import { useQuery } from '@tanstack/react-query'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Server, Clock, AlertTriangle, Activity, Loader2 } from 'lucide-react'
import { useTimeRange } from './TimeRangeContext'
import { useFilters } from './App'
import { mockDataAPI } from './apiClient'
import { MetricCard, Card, SectionHeader, StatusBadge } from './ui'

export function APIPage() {
  const { range } = useTimeRange()
  const { appliedBrand, appliedCountry } = useFilters()

  const filters = {
    brand: appliedBrand,
    country: appliedCountry,
    timeRange: range,
  }

  const { data: apiData, isLoading: apiLoading } = useQuery({
    queryKey: ['api-performance', appliedBrand, appliedCountry, range],
    queryFn: () => mockDataAPI.getAPIPerformance(filters),
  })

  const { data: timeSeriesData, isLoading: tsLoading } = useQuery({
    queryKey: ['api-timeseries', appliedBrand, appliedCountry, range],
    queryFn: () => mockDataAPI.getAPITimeSeries(filters),
  })

  const isLoading = apiLoading || tsLoading

  // Totals
  const totalRequests = apiData?.reduce((sum, a) => sum + a.request_count, 0) ?? 0
  const totalErrors = apiData?.reduce((sum, a) => sum + a.error_count, 0) ?? 0
  const avgLatency = apiData?.reduce((sum, a) => sum + a.avg_duration_ms * a.request_count, 0) / totalRequests || 0
  const p95Latency = Math.max(...(apiData?.map(a => a.p95_duration_ms) ?? [0]))
  const errorRate = (totalErrors / totalRequests) * 100 || 0

  const latencyTrend = timeSeriesData?.latency || []
  const requestsTrend = timeSeriesData?.requests || []
  const errorsTrend = timeSeriesData?.errors || []

  // By service
  const byService = apiData?.reduce((acc, a) => {
    if (!acc[a.service_name]) {
      acc[a.service_name] = { requests: 0, errors: 0, latency: 0, endpoints: [] as typeof apiData }
    }
    acc[a.service_name].requests += a.request_count
    acc[a.service_name].errors += a.error_count
    acc[a.service_name].latency += a.avg_duration_ms * a.request_count
    acc[a.service_name].endpoints.push(a)
    return acc
  }, {} as Record<string, { requests: number; errors: number; latency: number; endpoints: typeof apiData }>)

  const serviceList = Object.entries(byService ?? {}).map(([name, data]) => ({
    name,
    requests: data.requests,
    errors: data.errors,
    errorRate: (data.errors / data.requests) * 100,
    avgLatency: data.latency / data.requests,
    endpoints: data.endpoints,
  }))

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
          title="Total Requests"
          value={totalRequests.toLocaleString()}
          subtitle="This period"
          trend={8.5}
          icon={<Activity size={20} />}
          status="neutral"
          tooltip="Общее количество API запросов за выбранный период времени."
        />
        <MetricCard
          title="Error Rate"
          value={`${errorRate.toFixed(2)}%`}
          subtitle={`${totalErrors} errors`}
          trend={-0.3}
          icon={<AlertTriangle size={20} />}
          status={errorRate < 0.5 ? 'good' : errorRate < 2 ? 'warning' : 'critical'}
          tooltip="Процент неуспешных запросов (4xx + 5xx ошибки) от общего числа."
          thresholds={{ good: '<0.5%', warning: '0.5-2%', critical: '>2%' }}
        />
        <MetricCard
          title="Avg Latency"
          value={`${avgLatency.toFixed(0)}ms`}
          subtitle="Response time"
          trend={-2.1}
          icon={<Clock size={20} />}
          status={avgLatency < 200 ? 'good' : avgLatency < 500 ? 'warning' : 'critical'}
          tooltip="Среднее время ответа API в миллисекундах."
          thresholds={{ good: '<200ms', warning: '200-500ms', critical: '>500ms' }}
        />
        <MetricCard
          title="P95 Latency"
          value={`${p95Latency.toFixed(0)}ms`}
          subtitle="95th percentile"
          icon={<Server size={20} />}
          status={p95Latency < 500 ? 'good' : p95Latency < 1000 ? 'warning' : 'critical'}
          tooltip="95-й персентиль задержки — 95% запросов быстрее этого значения. Показывает 'хвост' медленных запросов."
          thresholds={{ good: '<500ms', warning: '500ms-1s', critical: '>1s' }}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-3 gap-6">
        {/* Latency Trend */}
        <Card>
          <SectionHeader title="Response Time" subtitle="Avg latency (ms)" />
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={latencyTrend}>
                <defs>
                  <linearGradient id="apiLatencyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={false} stroke="#374151" />
                <YAxis stroke="#6b7280" fontSize={10} width={40} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  labelFormatter={(t) => new Date(t).toLocaleTimeString()}
                  formatter={(value: number) => [`${value.toFixed(0)}ms`]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#apiLatencyGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Requests Trend */}
        <Card>
          <SectionHeader title="Request Volume" subtitle="Requests/min" />
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={requestsTrend}>
                <defs>
                  <linearGradient id="requestsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={false} stroke="#374151" />
                <YAxis stroke="#6b7280" fontSize={10} width={40} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  labelFormatter={(t) => new Date(t).toLocaleTimeString()}
                  formatter={(value: number) => [value.toFixed(0)]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#requestsGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Error Rate Trend */}
        <Card>
          <SectionHeader title="Error Rate" subtitle="Errors count" />
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={errorsTrend}>
                <defs>
                  <linearGradient id="errorsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={false} stroke="#374151" />
                <YAxis stroke="#6b7280" fontSize={10} width={40} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  labelFormatter={(t) => new Date(t).toLocaleTimeString()}
                  formatter={(value: number) => [value.toFixed(0)]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fill="url(#errorsGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Services Overview */}
      <Card>
        <SectionHeader title="Services" subtitle="Performance by service" />
        <div className="grid grid-cols-4 gap-4">
          {serviceList.map((service) => {
            const status = service.errorRate < 0.5 ? 'healthy'
              : service.errorRate < 2 ? 'degraded'
              : 'down'

            return (
              <div
                key={service.name}
                className="p-4 rounded-lg border border-theme"
                style={{ background: 'var(--bg-card-alt)' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-theme-primary capitalize">{service.name}</span>
                  <StatusBadge status={status} />
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-theme-muted">Requests</span>
                    <span className="text-theme-secondary">{service.requests.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-theme-muted">Avg Latency</span>
                    <span className="text-theme-secondary">{service.avgLatency.toFixed(0)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-theme-muted">Error Rate</span>
                    <span className={service.errorRate > 1 ? 'text-red-400' : 'text-theme-secondary'}>
                      {service.errorRate.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Endpoints Table */}
      <Card>
        <SectionHeader title="Endpoints" subtitle="Detailed performance metrics" />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-theme-muted border-b border-theme">
                <th className="pb-3 font-medium">Service</th>
                <th className="pb-3 font-medium">Endpoint</th>
                <th className="pb-3 font-medium">Requests</th>
                <th className="pb-3 font-medium">Avg</th>
                <th className="pb-3 font-medium">P95</th>
                <th className="pb-3 font-medium">Errors</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {apiData?.map((api) => {
                const errRate = (api.error_count / api.request_count) * 100
                const status = errRate < 0.5 ? 'healthy' : errRate < 2 ? 'degraded' : 'down'

                return (
                  <tr key={`${api.service_name}-${api.endpoint}`} className="border-b border-theme">
                    <td className="py-3">
                      <span className="text-sm font-medium text-theme-primary capitalize">
                        {api.service_name}
                      </span>
                    </td>
                    <td className="py-3">
                      <code className="text-xs px-2 py-1 rounded text-theme-secondary" style={{ background: 'var(--bg-card-alt)' }}>
                        {api.endpoint}
                      </code>
                    </td>
                    <td className="py-3 text-sm text-theme-secondary">
                      {api.request_count.toLocaleString()}
                    </td>
                    <td className="py-3 text-sm text-theme-primary">
                      {api.avg_duration_ms.toFixed(0)}ms
                    </td>
                    <td className="py-3 text-sm text-theme-secondary">
                      {api.p95_duration_ms.toFixed(0)}ms
                    </td>
                    <td className="py-3 text-sm">
                      <span className={api.error_count > 0 ? 'text-amber-400' : 'text-theme-secondary'}>
                        {api.error_count}
                      </span>
                    </td>
                    <td className="py-3">
                      <StatusBadge status={status} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
