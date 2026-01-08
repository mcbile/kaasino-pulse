package storage

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/mcbile/product-pulse/internal/model"
)

type Postgres struct {
	pool *pgxpool.Pool
}

func NewPostgres(databaseURL string) (*Postgres, error) {
	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("parse config: %w", err)
	}

	// Connection pool settings
	config.MaxConns = 20
	config.MinConns = 5
	config.MaxConnLifetime = time.Hour
	config.MaxConnIdleTime = 30 * time.Minute
	config.HealthCheckPeriod = time.Minute

	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		return nil, fmt.Errorf("create pool: %w", err)
	}

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("ping: %w", err)
	}

	return &Postgres{pool: pool}, nil
}

func (p *Postgres) Close() {
	p.pool.Close()
}

func (p *Postgres) Ping(ctx context.Context) error {
	return p.pool.Ping(ctx)
}

// InsertFrontendMetrics batch inserts frontend events
func (p *Postgres) InsertFrontendMetrics(ctx context.Context, events []model.EnrichedEvent) error {
	if len(events) == 0 {
		return nil
	}

	// Build batch insert
	columns := []string{
		"time", "session_id", "player_id", "device_type", "browser", "country",
		"event_type", "page_path", "lcp_ms", "fid_ms", "cls", "ttfb_ms", "fcp_ms", "inp_ms",
		"metric_name", "metric_value", "metadata",
	}

	valueStrings := make([]string, 0, len(events))
	valueArgs := make([]interface{}, 0, len(events)*len(columns))

	for i, e := range events {
		base := i * len(columns)
		placeholders := make([]string, len(columns))
		for j := range columns {
			placeholders[j] = fmt.Sprintf("$%d", base+j+1)
		}
		valueStrings = append(valueStrings, "("+strings.Join(placeholders, ", ")+")")

		valueArgs = append(valueArgs,
			e.Time, e.SessionID, e.PlayerID, e.DeviceType, e.Browser, e.Country,
			e.EventType, e.PagePath, e.LCP, e.FID, e.CLS, e.TTFB, e.FCP, e.INP,
			e.MetricName, e.MetricValue, e.Metadata,
		)
	}

	query := fmt.Sprintf(
		"INSERT INTO frontend_metrics (%s) VALUES %s",
		strings.Join(columns, ", "),
		strings.Join(valueStrings, ", "),
	)

	_, err := p.pool.Exec(ctx, query, valueArgs...)
	return err
}

// InsertAPIMetrics batch inserts API metrics
func (p *Postgres) InsertAPIMetrics(ctx context.Context, metrics []model.APIMetric) error {
	if len(metrics) == 0 {
		return nil
	}

	columns := []string{
		"time", "service_name", "endpoint", "method", "duration_ms", "status_code",
		"player_id", "request_id", "error_type", "error_message",
		"request_size", "response_size", "metadata",
	}

	valueStrings := make([]string, 0, len(metrics))
	valueArgs := make([]interface{}, 0, len(metrics)*len(columns))

	for i, m := range metrics {
		base := i * len(columns)
		placeholders := make([]string, len(columns))
		for j := range columns {
			placeholders[j] = fmt.Sprintf("$%d", base+j+1)
		}
		valueStrings = append(valueStrings, "("+strings.Join(placeholders, ", ")+")")

		valueArgs = append(valueArgs,
			m.Time, m.ServiceName, m.Endpoint, m.Method, m.DurationMS, m.StatusCode,
			m.PlayerID, m.RequestID, m.ErrorType, m.ErrorMessage,
			m.RequestSize, m.ResponseSize, m.Metadata,
		)
	}

	query := fmt.Sprintf(
		"INSERT INTO api_metrics (%s) VALUES %s",
		strings.Join(columns, ", "),
		strings.Join(valueStrings, ", "),
	)

	_, err := p.pool.Exec(ctx, query, valueArgs...)
	return err
}

// InsertPSPMetrics batch inserts PSP metrics
func (p *Postgres) InsertPSPMetrics(ctx context.Context, metrics []model.PSPMetric) error {
	if len(metrics) == 0 {
		return nil
	}

	columns := []string{
		"time", "psp_name", "operation", "duration_ms", "success",
		"player_id", "transaction_id", "amount", "currency",
		"error_code", "error_message", "psp_response_code", "metadata",
	}

	valueStrings := make([]string, 0, len(metrics))
	valueArgs := make([]interface{}, 0, len(metrics)*len(columns))

	for i, m := range metrics {
		base := i * len(columns)
		placeholders := make([]string, len(columns))
		for j := range columns {
			placeholders[j] = fmt.Sprintf("$%d", base+j+1)
		}
		valueStrings = append(valueStrings, "("+strings.Join(placeholders, ", ")+")")

		valueArgs = append(valueArgs,
			m.Time, m.PSPName, m.Operation, m.DurationMS, m.Success,
			m.PlayerID, m.TransactionID, m.Amount, m.Currency,
			m.ErrorCode, m.ErrorMessage, m.PSPResponseCode, m.Metadata,
		)
	}

	query := fmt.Sprintf(
		"INSERT INTO psp_metrics (%s) VALUES %s",
		strings.Join(columns, ", "),
		strings.Join(valueStrings, ", "),
	)

	_, err := p.pool.Exec(ctx, query, valueArgs...)
	return err
}

// InsertGameMetrics batch inserts game provider metrics
func (p *Postgres) InsertGameMetrics(ctx context.Context, metrics []model.GameMetric) error {
	if len(metrics) == 0 {
		return nil
	}

	columns := []string{
		"time", "provider", "game_id", "game_type", "load_time_ms", "launch_success",
		"player_id", "session_id", "device_type", "error_type", "error_message", "metadata",
	}

	valueStrings := make([]string, 0, len(metrics))
	valueArgs := make([]interface{}, 0, len(metrics)*len(columns))

	for i, m := range metrics {
		base := i * len(columns)
		placeholders := make([]string, len(columns))
		for j := range columns {
			placeholders[j] = fmt.Sprintf("$%d", base+j+1)
		}
		valueStrings = append(valueStrings, "("+strings.Join(placeholders, ", ")+")")

		valueArgs = append(valueArgs,
			m.Time, m.Provider, m.GameID, m.GameType, m.LoadTimeMS, m.LaunchSuccess,
			m.PlayerID, m.SessionID, m.DeviceType, m.ErrorType, m.ErrorMessage, m.Metadata,
		)
	}

	query := fmt.Sprintf(
		"INSERT INTO game_metrics (%s) VALUES %s",
		strings.Join(columns, ", "),
		strings.Join(valueStrings, ", "),
	)

	_, err := p.pool.Exec(ctx, query, valueArgs...)
	return err
}

// InsertWebSocketMetrics batch inserts WebSocket metrics
func (p *Postgres) InsertWebSocketMetrics(ctx context.Context, metrics []model.WebSocketMetric) error {
	if len(metrics) == 0 {
		return nil
	}

	columns := []string{
		"time", "connection_id", "player_id", "event_type", "latency_ms",
		"messages_sent", "messages_received", "close_code", "close_reason",
		"endpoint", "device_type", "metadata",
	}

	valueStrings := make([]string, 0, len(metrics))
	valueArgs := make([]interface{}, 0, len(metrics)*len(columns))

	for i, m := range metrics {
		base := i * len(columns)
		placeholders := make([]string, len(columns))
		for j := range columns {
			placeholders[j] = fmt.Sprintf("$%d", base+j+1)
		}
		valueStrings = append(valueStrings, "("+strings.Join(placeholders, ", ")+")")

		valueArgs = append(valueArgs,
			m.Time, m.ConnectionID, m.PlayerID, m.EventType, m.LatencyMS,
			m.MessagesSent, m.MessagesReceived, m.CloseCode, m.CloseReason,
			m.Endpoint, m.DeviceType, m.Metadata,
		)
	}

	query := fmt.Sprintf(
		"INSERT INTO websocket_metrics (%s) VALUES %s",
		strings.Join(columns, ", "),
		strings.Join(valueStrings, ", "),
	)

	_, err := p.pool.Exec(ctx, query, valueArgs...)
	return err
}

// CopyFrontendMetrics uses COPY for maximum throughput
func (p *Postgres) CopyFrontendMetrics(ctx context.Context, events []model.EnrichedEvent) error {
	if len(events) == 0 {
		return nil
	}

	columns := []string{
		"time", "session_id", "player_id", "device_type", "browser", "country",
		"event_type", "page_path", "lcp_ms", "fid_ms", "cls", "ttfb_ms", "fcp_ms", "inp_ms",
		"metric_name", "metric_value", "metadata",
	}

	rows := make([][]interface{}, len(events))
	for i, e := range events {
		rows[i] = []interface{}{
			e.Time, e.SessionID, e.PlayerID, e.DeviceType, e.Browser, e.Country,
			e.EventType, e.PagePath, e.LCP, e.FID, e.CLS, e.TTFB, e.FCP, e.INP,
			e.MetricName, e.MetricValue, e.Metadata,
		}
	}

	_, err := p.pool.CopyFrom(
		ctx,
		pgx.Identifier{"frontend_metrics"},
		columns,
		pgx.CopyFromRows(rows),
	)

	return err
}

// ============================================
// DASHBOARD QUERY METHODS
// ============================================

// APIPerformanceRow represents a row from api_performance_1m
type APIPerformanceRow struct {
	Bucket           time.Time `json:"bucket"`
	ServiceName      string    `json:"service_name"`
	Endpoint         string    `json:"endpoint"`
	RequestCount     int64     `json:"request_count"`
	AvgDurationMS    float64   `json:"avg_duration_ms"`
	P95DurationMS    float64   `json:"p95_duration_ms"`
	P99DurationMS    float64   `json:"p99_duration_ms"`
	ErrorCount       int64     `json:"error_count"`
	ServerErrorCount int64     `json:"server_error_count"`
}

// GetAPIPerformance retrieves API performance metrics from continuous aggregate
func (p *Postgres) GetAPIPerformance(ctx context.Context, start time.Time) ([]APIPerformanceRow, error) {
	query := `
		SELECT bucket, service_name, endpoint, request_count,
		       avg_duration_ms, p95_duration_ms, p99_duration_ms,
		       error_count, server_error_count
		FROM api_performance_1m
		WHERE bucket >= $1
		ORDER BY bucket DESC, service_name, endpoint
	`

	rows, err := p.pool.Query(ctx, query, start)
	if err != nil {
		return nil, fmt.Errorf("query api_performance_1m: %w", err)
	}
	defer rows.Close()

	var result []APIPerformanceRow
	for rows.Next() {
		var r APIPerformanceRow
		if err := rows.Scan(
			&r.Bucket, &r.ServiceName, &r.Endpoint, &r.RequestCount,
			&r.AvgDurationMS, &r.P95DurationMS, &r.P99DurationMS,
			&r.ErrorCount, &r.ServerErrorCount,
		); err != nil {
			return nil, fmt.Errorf("scan row: %w", err)
		}
		result = append(result, r)
	}

	return result, rows.Err()
}

// TimeSeriesPoint represents a single point in time series
type TimeSeriesPoint struct {
	Time  time.Time `json:"time"`
	Value float64   `json:"value"`
}

// GetAPITimeSeries retrieves time series for a specific service
func (p *Postgres) GetAPITimeSeries(ctx context.Context, serviceName string, start time.Time) ([]TimeSeriesPoint, error) {
	query := `
		SELECT bucket, avg_duration_ms
		FROM api_performance_1m
		WHERE service_name = $1 AND bucket >= $2
		ORDER BY bucket ASC
	`

	rows, err := p.pool.Query(ctx, query, serviceName, start)
	if err != nil {
		return nil, fmt.Errorf("query api timeseries: %w", err)
	}
	defer rows.Close()

	var result []TimeSeriesPoint
	for rows.Next() {
		var r TimeSeriesPoint
		if err := rows.Scan(&r.Time, &r.Value); err != nil {
			return nil, fmt.Errorf("scan row: %w", err)
		}
		result = append(result, r)
	}

	return result, rows.Err()
}

// PSPHealthRow represents a row from psp_success_5m
type PSPHealthRow struct {
	Bucket        time.Time `json:"bucket"`
	PSPName       string    `json:"psp_name"`
	Operation     string    `json:"operation"`
	TotalCount    int64     `json:"total_count"`
	SuccessCount  int64     `json:"success_count"`
	AvgDurationMS float64   `json:"avg_duration_ms"`
	P95DurationMS float64   `json:"p95_duration_ms"`
	TotalAmount   float64   `json:"total_amount"`
}

// GetPSPHealth retrieves PSP health metrics from continuous aggregate
func (p *Postgres) GetPSPHealth(ctx context.Context, start time.Time) ([]PSPHealthRow, error) {
	query := `
		SELECT bucket, psp_name, operation, total_count, success_count,
		       avg_duration_ms, p95_duration_ms, COALESCE(total_amount, 0)
		FROM psp_success_5m
		WHERE bucket >= $1
		ORDER BY bucket DESC, psp_name, operation
	`

	rows, err := p.pool.Query(ctx, query, start)
	if err != nil {
		return nil, fmt.Errorf("query psp_success_5m: %w", err)
	}
	defer rows.Close()

	var result []PSPHealthRow
	for rows.Next() {
		var r PSPHealthRow
		if err := rows.Scan(
			&r.Bucket, &r.PSPName, &r.Operation, &r.TotalCount, &r.SuccessCount,
			&r.AvgDurationMS, &r.P95DurationMS, &r.TotalAmount,
		); err != nil {
			return nil, fmt.Errorf("scan row: %w", err)
		}
		result = append(result, r)
	}

	return result, rows.Err()
}

// GetPSPTimeSeries retrieves time series for a specific PSP
func (p *Postgres) GetPSPTimeSeries(ctx context.Context, pspName string, start time.Time) ([]TimeSeriesPoint, error) {
	query := `
		SELECT bucket,
		       CASE WHEN total_count > 0 THEN success_count::float / total_count * 100 ELSE 100 END as success_rate
		FROM psp_success_5m
		WHERE psp_name = $1 AND bucket >= $2
		ORDER BY bucket ASC
	`

	rows, err := p.pool.Query(ctx, query, pspName, start)
	if err != nil {
		return nil, fmt.Errorf("query psp timeseries: %w", err)
	}
	defer rows.Close()

	var result []TimeSeriesPoint
	for rows.Next() {
		var r TimeSeriesPoint
		if err := rows.Scan(&r.Time, &r.Value); err != nil {
			return nil, fmt.Errorf("scan row: %w", err)
		}
		result = append(result, r)
	}

	return result, rows.Err()
}

// WebVitalsRow represents a row from web_vitals_hourly
type WebVitalsRow struct {
	Bucket      time.Time `json:"bucket"`
	DeviceType  string    `json:"device_type"`
	PagePath    string    `json:"page_path"`
	SampleCount int64     `json:"sample_count"`
	AvgLCPMS    float64   `json:"avg_lcp_ms"`
	P75LCPMS    float64   `json:"p75_lcp_ms"`
	AvgFIDMS    float64   `json:"avg_fid_ms"`
	P75FIDMS    float64   `json:"p75_fid_ms"`
	AvgCLS      float64   `json:"avg_cls"`
	P75CLS      float64   `json:"p75_cls"`
	AvgINPMS    float64   `json:"avg_inp_ms"`
	P75INPMS    float64   `json:"p75_inp_ms"`
}

// GetWebVitals retrieves Web Vitals metrics from continuous aggregate
func (p *Postgres) GetWebVitals(ctx context.Context, start time.Time) ([]WebVitalsRow, error) {
	query := `
		SELECT bucket, COALESCE(device_type, 'unknown'), COALESCE(page_path, '/'),
		       sample_count, COALESCE(avg_lcp_ms, 0), COALESCE(p75_lcp_ms, 0),
		       COALESCE(avg_fid_ms, 0), COALESCE(p75_fid_ms, 0),
		       COALESCE(avg_cls, 0), COALESCE(p75_cls, 0),
		       COALESCE(avg_inp_ms, 0), COALESCE(p75_inp_ms, 0)
		FROM web_vitals_hourly
		WHERE bucket >= $1
		ORDER BY bucket DESC, device_type, page_path
	`

	rows, err := p.pool.Query(ctx, query, start)
	if err != nil {
		return nil, fmt.Errorf("query web_vitals_hourly: %w", err)
	}
	defer rows.Close()

	var result []WebVitalsRow
	for rows.Next() {
		var r WebVitalsRow
		if err := rows.Scan(
			&r.Bucket, &r.DeviceType, &r.PagePath, &r.SampleCount,
			&r.AvgLCPMS, &r.P75LCPMS, &r.AvgFIDMS, &r.P75FIDMS,
			&r.AvgCLS, &r.P75CLS, &r.AvgINPMS, &r.P75INPMS,
		); err != nil {
			return nil, fmt.Errorf("scan row: %w", err)
		}
		result = append(result, r)
	}

	return result, rows.Err()
}

// GetWebVitalsTimeSeries retrieves time series for a specific metric
func (p *Postgres) GetWebVitalsTimeSeries(ctx context.Context, metric string, start time.Time) ([]TimeSeriesPoint, error) {
	// Map metric name to column
	column := "avg_lcp_ms"
	switch metric {
	case "lcp":
		column = "avg_lcp_ms"
	case "fid":
		column = "avg_fid_ms"
	case "cls":
		column = "avg_cls"
	case "inp":
		column = "avg_inp_ms"
	}

	query := fmt.Sprintf(`
		SELECT bucket, COALESCE(AVG(%s), 0)
		FROM web_vitals_hourly
		WHERE bucket >= $1
		GROUP BY bucket
		ORDER BY bucket ASC
	`, column)

	rows, err := p.pool.Query(ctx, query, start)
	if err != nil {
		return nil, fmt.Errorf("query vitals timeseries: %w", err)
	}
	defer rows.Close()

	var result []TimeSeriesPoint
	for rows.Next() {
		var r TimeSeriesPoint
		if err := rows.Scan(&r.Time, &r.Value); err != nil {
			return nil, fmt.Errorf("scan row: %w", err)
		}
		result = append(result, r)
	}

	return result, rows.Err()
}

// GameHealthRow represents a row from game_health_5m
type GameHealthRow struct {
	Bucket        time.Time `json:"bucket"`
	Provider      string    `json:"provider"`
	GameType      string    `json:"game_type"`
	LaunchCount   int64     `json:"launch_count"`
	SuccessCount  int64     `json:"success_count"`
	AvgLoadTimeMS float64   `json:"avg_load_time_ms"`
	P95LoadTimeMS float64   `json:"p95_load_time_ms"`
}

// GetGameHealth retrieves game provider health metrics
func (p *Postgres) GetGameHealth(ctx context.Context, start time.Time) ([]GameHealthRow, error) {
	query := `
		SELECT bucket, provider, COALESCE(game_type, 'unknown'),
		       launch_count, success_count,
		       COALESCE(avg_load_time_ms, 0), COALESCE(p95_load_time_ms, 0)
		FROM game_health_5m
		WHERE bucket >= $1
		ORDER BY bucket DESC, provider, game_type
	`

	rows, err := p.pool.Query(ctx, query, start)
	if err != nil {
		return nil, fmt.Errorf("query game_health_5m: %w", err)
	}
	defer rows.Close()

	var result []GameHealthRow
	for rows.Next() {
		var r GameHealthRow
		if err := rows.Scan(
			&r.Bucket, &r.Provider, &r.GameType,
			&r.LaunchCount, &r.SuccessCount,
			&r.AvgLoadTimeMS, &r.P95LoadTimeMS,
		); err != nil {
			return nil, fmt.Errorf("scan row: %w", err)
		}
		result = append(result, r)
	}

	return result, rows.Err()
}

// GetGameTimeSeries retrieves time series for a specific provider
func (p *Postgres) GetGameTimeSeries(ctx context.Context, provider string, start time.Time) ([]TimeSeriesPoint, error) {
	query := `
		SELECT bucket,
		       CASE WHEN launch_count > 0 THEN success_count::float / launch_count * 100 ELSE 100 END
		FROM game_health_5m
		WHERE provider = $1 AND bucket >= $2
		ORDER BY bucket ASC
	`

	rows, err := p.pool.Query(ctx, query, provider, start)
	if err != nil {
		return nil, fmt.Errorf("query game timeseries: %w", err)
	}
	defer rows.Close()

	var result []TimeSeriesPoint
	for rows.Next() {
		var r TimeSeriesPoint
		if err := rows.Scan(&r.Time, &r.Value); err != nil {
			return nil, fmt.Errorf("scan row: %w", err)
		}
		result = append(result, r)
	}

	return result, rows.Err()
}

// OverviewMetrics represents aggregated overview data
type OverviewMetrics struct {
	ActiveSessions  int64   `json:"active_sessions"`
	GGRToday        float64 `json:"ggr_today"`
	DepositsCount   int64   `json:"deposits_count"`
	DepositsVolume  float64 `json:"deposits_volume"`
	ErrorRate       float64 `json:"error_rate"`
	AvgLatencyMS    float64 `json:"avg_latency_ms"`
	PSPSuccessRate  float64 `json:"psp_success_rate"`
	GameSuccessRate float64 `json:"game_success_rate"`
}

// GetOverviewMetrics retrieves aggregated overview metrics
func (p *Postgres) GetOverviewMetrics(ctx context.Context, start time.Time) (*OverviewMetrics, error) {
	result := &OverviewMetrics{}

	// Active sessions (distinct session_ids in last 15 min)
	err := p.pool.QueryRow(ctx, `
		SELECT COUNT(DISTINCT session_id)
		FROM frontend_metrics
		WHERE time >= $1
	`, start).Scan(&result.ActiveSessions)
	if err != nil {
		return nil, fmt.Errorf("query active sessions: %w", err)
	}

	// API error rate and latency
	err = p.pool.QueryRow(ctx, `
		SELECT
			COALESCE(AVG(CASE WHEN error_count > 0 THEN error_count::float / NULLIF(request_count, 0) * 100 ELSE 0 END), 0),
			COALESCE(AVG(avg_duration_ms), 0)
		FROM api_performance_1m
		WHERE bucket >= $1
	`, start).Scan(&result.ErrorRate, &result.AvgLatencyMS)
	if err != nil {
		return nil, fmt.Errorf("query api metrics: %w", err)
	}

	// PSP metrics
	err = p.pool.QueryRow(ctx, `
		SELECT
			COALESCE(SUM(CASE WHEN operation = 'deposit' THEN total_count ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN operation = 'deposit' THEN total_amount ELSE 0 END), 0),
			COALESCE(AVG(CASE WHEN total_count > 0 THEN success_count::float / total_count * 100 ELSE 100 END), 100)
		FROM psp_success_5m
		WHERE bucket >= $1
	`, start).Scan(&result.DepositsCount, &result.DepositsVolume, &result.PSPSuccessRate)
	if err != nil {
		return nil, fmt.Errorf("query psp metrics: %w", err)
	}

	// Game success rate
	err = p.pool.QueryRow(ctx, `
		SELECT COALESCE(AVG(CASE WHEN launch_count > 0 THEN success_count::float / launch_count * 100 ELSE 100 END), 100)
		FROM game_health_5m
		WHERE bucket >= $1
	`, start).Scan(&result.GameSuccessRate)
	if err != nil {
		return nil, fmt.Errorf("query game metrics: %w", err)
	}

	return result, nil
}

// AlertRow represents an alert event
type AlertRow struct {
	Time           time.Time  `json:"time"`
	AlertType      string     `json:"alert_type"`
	Severity       string     `json:"severity"`
	SourceTable    string     `json:"source_table"`
	MetricName     string     `json:"metric_name"`
	ThresholdValue float64    `json:"threshold_value"`
	ActualValue    float64    `json:"actual_value"`
	Acknowledged   bool       `json:"acknowledged"`
	ResolvedAt     *time.Time `json:"resolved_at"`
	Message        string     `json:"message"`
}

// GetAlerts retrieves alert events
func (p *Postgres) GetAlerts(ctx context.Context, resolved *bool) ([]AlertRow, error) {
	query := `
		SELECT time, alert_type, severity, COALESCE(source_table, ''),
		       COALESCE(metric_name, ''), COALESCE(threshold_value, 0),
		       COALESCE(actual_value, 0), acknowledged, resolved_at, COALESCE(message, '')
		FROM alert_events
		WHERE ($1::boolean IS NULL OR (resolved_at IS NOT NULL) = $1)
		ORDER BY time DESC
		LIMIT 100
	`

	rows, err := p.pool.Query(ctx, query, resolved)
	if err != nil {
		return nil, fmt.Errorf("query alerts: %w", err)
	}
	defer rows.Close()

	var result []AlertRow
	for rows.Next() {
		var r AlertRow
		if err := rows.Scan(
			&r.Time, &r.AlertType, &r.Severity, &r.SourceTable,
			&r.MetricName, &r.ThresholdValue, &r.ActualValue,
			&r.Acknowledged, &r.ResolvedAt, &r.Message,
		); err != nil {
			return nil, fmt.Errorf("scan row: %w", err)
		}
		result = append(result, r)
	}

	return result, rows.Err()
}

// AcknowledgeAlert marks an alert as acknowledged
func (p *Postgres) AcknowledgeAlert(ctx context.Context, alertTime time.Time) error {
	_, err := p.pool.Exec(ctx, `
		UPDATE alert_events
		SET acknowledged = true
		WHERE time = $1
	`, alertTime)
	return err
}
