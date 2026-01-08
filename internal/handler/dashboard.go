package handler

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/mcbile/product-pulse/internal/storage"
)

// DashboardHandler handles dashboard API endpoints
type DashboardHandler struct {
	db             *storage.Postgres
	allowedOrigins map[string]bool
	allowAll       bool
}

// NewDashboardHandler creates a new dashboard handler
func NewDashboardHandler(db *storage.Postgres, origins []string) *DashboardHandler {
	h := &DashboardHandler{
		db:             db,
		allowedOrigins: make(map[string]bool),
	}
	for _, o := range origins {
		if o == "*" {
			h.allowAll = true
			break
		}
		h.allowedOrigins[o] = true
	}
	return h
}

func (h *DashboardHandler) setCORS(w http.ResponseWriter, r *http.Request) {
	origin := r.Header.Get("Origin")
	if h.allowAll {
		w.Header().Set("Access-Control-Allow-Origin", "*")
	} else if h.allowedOrigins[origin] {
		w.Header().Set("Access-Control-Allow-Origin", origin)
	}
	w.Header().Set("Content-Type", "application/json")
}

func (h *DashboardHandler) parseStartTime(r *http.Request) time.Time {
	startStr := r.URL.Query().Get("start")
	if startStr != "" {
		if t, err := time.Parse(time.RFC3339, startStr); err == nil {
			return t
		}
	}
	// Default: last 1 hour
	return time.Now().Add(-time.Hour)
}

// HandleOverview returns aggregated overview metrics
// GET /api/metrics/overview?start=2024-01-15T10:00:00Z
func (h *DashboardHandler) HandleOverview(w http.ResponseWriter, r *http.Request) {
	h.setCORS(w, r)

	start := h.parseStartTime(r)
	ctx := r.Context()

	metrics, err := h.db.GetOverviewMetrics(ctx, start)
	if err != nil {
		slog.Error("failed to get overview metrics", "error", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(metrics)
}

// HandleAPIPerformance returns API performance metrics
// GET /api/metrics/api?start=2024-01-15T10:00:00Z
func (h *DashboardHandler) HandleAPIPerformance(w http.ResponseWriter, r *http.Request) {
	h.setCORS(w, r)

	start := h.parseStartTime(r)
	ctx := r.Context()

	metrics, err := h.db.GetAPIPerformance(ctx, start)
	if err != nil {
		slog.Error("failed to get API performance", "error", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(metrics)
}

// HandleAPITimeSeries returns API latency time series for a service
// GET /api/metrics/api/timeseries?service=auth&start=2024-01-15T10:00:00Z
func (h *DashboardHandler) HandleAPITimeSeries(w http.ResponseWriter, r *http.Request) {
	h.setCORS(w, r)

	service := r.URL.Query().Get("service")
	if service == "" {
		http.Error(w, "service parameter required", http.StatusBadRequest)
		return
	}

	start := h.parseStartTime(r)
	ctx := r.Context()

	series, err := h.db.GetAPITimeSeries(ctx, service, start)
	if err != nil {
		slog.Error("failed to get API timeseries", "error", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(series)
}

// HandlePSPHealth returns PSP health metrics
// GET /api/metrics/psp?start=2024-01-15T10:00:00Z
func (h *DashboardHandler) HandlePSPHealth(w http.ResponseWriter, r *http.Request) {
	h.setCORS(w, r)

	start := h.parseStartTime(r)
	ctx := r.Context()

	metrics, err := h.db.GetPSPHealth(ctx, start)
	if err != nil {
		slog.Error("failed to get PSP health", "error", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(metrics)
}

// HandlePSPTimeSeries returns PSP success rate time series
// GET /api/metrics/psp/timeseries?psp=PIX&start=2024-01-15T10:00:00Z
func (h *DashboardHandler) HandlePSPTimeSeries(w http.ResponseWriter, r *http.Request) {
	h.setCORS(w, r)

	psp := r.URL.Query().Get("psp")
	if psp == "" {
		http.Error(w, "psp parameter required", http.StatusBadRequest)
		return
	}

	start := h.parseStartTime(r)
	ctx := r.Context()

	series, err := h.db.GetPSPTimeSeries(ctx, psp, start)
	if err != nil {
		slog.Error("failed to get PSP timeseries", "error", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(series)
}

// HandleWebVitals returns Web Vitals metrics
// GET /api/metrics/vitals?start=2024-01-15T10:00:00Z
func (h *DashboardHandler) HandleWebVitals(w http.ResponseWriter, r *http.Request) {
	h.setCORS(w, r)

	start := h.parseStartTime(r)
	ctx := r.Context()

	metrics, err := h.db.GetWebVitals(ctx, start)
	if err != nil {
		slog.Error("failed to get Web Vitals", "error", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(metrics)
}

// HandleWebVitalsTimeSeries returns Web Vitals time series for a metric
// GET /api/metrics/vitals/timeseries?metric=lcp&start=2024-01-15T10:00:00Z
func (h *DashboardHandler) HandleWebVitalsTimeSeries(w http.ResponseWriter, r *http.Request) {
	h.setCORS(w, r)

	metric := r.URL.Query().Get("metric")
	if metric == "" {
		metric = "lcp"
	}

	start := h.parseStartTime(r)
	ctx := r.Context()

	series, err := h.db.GetWebVitalsTimeSeries(ctx, metric, start)
	if err != nil {
		slog.Error("failed to get Vitals timeseries", "error", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(series)
}

// HandleGameHealth returns game provider health metrics
// GET /api/metrics/games?start=2024-01-15T10:00:00Z
func (h *DashboardHandler) HandleGameHealth(w http.ResponseWriter, r *http.Request) {
	h.setCORS(w, r)

	start := h.parseStartTime(r)
	ctx := r.Context()

	metrics, err := h.db.GetGameHealth(ctx, start)
	if err != nil {
		slog.Error("failed to get game health", "error", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(metrics)
}

// HandleGameTimeSeries returns game provider success rate time series
// GET /api/metrics/games/timeseries?provider=Pragmatic&start=2024-01-15T10:00:00Z
func (h *DashboardHandler) HandleGameTimeSeries(w http.ResponseWriter, r *http.Request) {
	h.setCORS(w, r)

	provider := r.URL.Query().Get("provider")
	if provider == "" {
		http.Error(w, "provider parameter required", http.StatusBadRequest)
		return
	}

	start := h.parseStartTime(r)
	ctx := r.Context()

	series, err := h.db.GetGameTimeSeries(ctx, provider, start)
	if err != nil {
		slog.Error("failed to get game timeseries", "error", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(series)
}

// HandleAlerts returns alert events
// GET /api/alerts?resolved=false
func (h *DashboardHandler) HandleAlerts(w http.ResponseWriter, r *http.Request) {
	h.setCORS(w, r)

	var resolved *bool
	if resolvedStr := r.URL.Query().Get("resolved"); resolvedStr != "" {
		b := resolvedStr == "true"
		resolved = &b
	}

	ctx := r.Context()

	alerts, err := h.db.GetAlerts(ctx, resolved)
	if err != nil {
		slog.Error("failed to get alerts", "error", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(alerts)
}

// HandleAcknowledgeAlert marks an alert as acknowledged
// POST /api/alerts/{time}/acknowledge
func (h *DashboardHandler) HandleAcknowledgeAlert(w http.ResponseWriter, r *http.Request) {
	h.setCORS(w, r)

	// Parse alert time from path
	// Path pattern: /api/alerts/{alertTime}/acknowledge
	alertTimeStr := r.PathValue("alertTime")
	if alertTimeStr == "" {
		http.Error(w, "alert time required", http.StatusBadRequest)
		return
	}

	alertTime, err := time.Parse(time.RFC3339, alertTimeStr)
	if err != nil {
		http.Error(w, "invalid alert time format", http.StatusBadRequest)
		return
	}

	ctx := r.Context()

	if err := h.db.AcknowledgeAlert(ctx, alertTime); err != nil {
		slog.Error("failed to acknowledge alert", "error", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"ok"}`))
}

// HandleCORS handles OPTIONS preflight requests for dashboard endpoints
func (h *DashboardHandler) HandleCORS(w http.ResponseWriter, r *http.Request) {
	origin := r.Header.Get("Origin")

	if h.allowAll {
		w.Header().Set("Access-Control-Allow-Origin", "*")
	} else if h.allowedOrigins[origin] {
		w.Header().Set("Access-Control-Allow-Origin", origin)
	}

	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Access-Control-Max-Age", "86400")
	w.WriteHeader(http.StatusNoContent)
}
