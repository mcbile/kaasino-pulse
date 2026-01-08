package handler

import (
	"encoding/json"
	"log/slog"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/mcbile/product-pulse/internal/collector"
	"github.com/mcbile/product-pulse/internal/model"
	"github.com/mcbile/product-pulse/internal/storage"
)

// ============================================
// COLLECT HANDLER
// ============================================

type CollectHandler struct {
	collector      *collector.BatchCollector
	allowedOrigins map[string]bool
	allowAll       bool
}

func NewCollectHandler(c *collector.BatchCollector, origins []string) *CollectHandler {
	h := &CollectHandler{
		collector:      c,
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

func (h *CollectHandler) Handle(w http.ResponseWriter, r *http.Request) {
	// CORS
	origin := r.Header.Get("Origin")
	if h.allowAll {
		w.Header().Set("Access-Control-Allow-Origin", "*")
	} else if h.allowedOrigins[origin] {
		w.Header().Set("Access-Control-Allow-Origin", origin)
	}

	// Parse body
	var batch model.EventBatch
	if err := json.NewDecoder(r.Body).Decode(&batch); err != nil {
		slog.Debug("invalid request body", "error", err)
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	if len(batch.Events) == 0 {
		w.WriteHeader(http.StatusAccepted)
		return
	}

	// Get client info
	clientIP := getClientIP(r)
	userAgent := r.UserAgent()
	country := resolveCountry(clientIP)

	// Enrich and queue events
	for _, event := range batch.Events {
		enriched := model.EnrichedEvent{
			FrontendEvent: event,
			Country:       country,
			UserAgent:     userAgent,
			IP:            clientIP,
		}

		// Override country if not set
		if event.Country == nil || *event.Country == "" {
			enriched.FrontendEvent.Country = &country
		}

		// Validate timestamp (not too far in past/future)
		if event.Time.IsZero() {
			enriched.FrontendEvent.Time = time.Now().UTC()
		} else {
			// Allow up to 1 hour drift
			diff := time.Since(event.Time)
			if diff < -time.Hour || diff > time.Hour {
				enriched.FrontendEvent.Time = time.Now().UTC()
			}
		}

		h.collector.Push(enriched)
	}

	w.WriteHeader(http.StatusAccepted)
	w.Write([]byte(`{"status":"ok"}`))
}

func (h *CollectHandler) HandleCORS(w http.ResponseWriter, r *http.Request) {
	origin := r.Header.Get("Origin")

	if h.allowAll {
		w.Header().Set("Access-Control-Allow-Origin", "*")
	} else if h.allowedOrigins[origin] {
		w.Header().Set("Access-Control-Allow-Origin", origin)
	}

	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-Site-Id")
	w.Header().Set("Access-Control-Max-Age", "86400")
	w.WriteHeader(http.StatusNoContent)
}

func getClientIP(r *http.Request) string {
	// Check common proxy headers
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		return strings.TrimSpace(parts[0])
	}

	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return xri
	}

	// Fall back to RemoteAddr
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return ip
}

// resolveCountry from IP - placeholder for GeoIP integration
func resolveCountry(ip string) string {
	// TODO: Integrate MaxMind GeoIP2 or ip-api.com
	// For now, return empty and let DB handle it
	return ""
}

// ============================================
// HEALTH HANDLER
// ============================================

type HealthHandler struct {
	db *storage.Postgres
}

func NewHealthHandler(db *storage.Postgres) *HealthHandler {
	return &HealthHandler{db: db}
}

func (h *HealthHandler) Handle(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status":"ok"}`))
}

func (h *HealthHandler) HandleReady(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	if err := h.db.Ping(ctx); err != nil {
		slog.Error("readiness check failed", "error", err)
		w.WriteHeader(http.StatusServiceUnavailable)
		w.Write([]byte(`{"status":"error","message":"database unavailable"}`))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status":"ok"}`))
}

// ============================================
// METRICS HANDLER
// ============================================

type MetricsHandler struct {
	collector *collector.BatchCollector
}

func NewMetricsHandler(c *collector.BatchCollector) *MetricsHandler {
	return &MetricsHandler{collector: c}
}

func (h *MetricsHandler) Handle(w http.ResponseWriter, r *http.Request) {
	stats := h.collector.GetStats()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

// ============================================
// API COLLECT HANDLER (for Go services)
// ============================================

type APICollectHandler struct {
	db             *storage.Postgres
	allowedOrigins map[string]bool
	allowAll       bool
}

func NewAPICollectHandler(db *storage.Postgres, origins []string) *APICollectHandler {
	h := &APICollectHandler{
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

func (h *APICollectHandler) Handle(w http.ResponseWriter, r *http.Request) {
	h.setCORS(w, r)

	var batch struct {
		Metrics []model.APIMetric `json:"metrics"`
	}
	if err := json.NewDecoder(r.Body).Decode(&batch); err != nil {
		slog.Debug("invalid request body", "error", err)
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	if len(batch.Metrics) == 0 {
		w.WriteHeader(http.StatusAccepted)
		return
	}

	// Validate timestamps
	now := time.Now().UTC()
	for i := range batch.Metrics {
		if batch.Metrics[i].Time.IsZero() {
			batch.Metrics[i].Time = now
		}
	}

	ctx := r.Context()
	if err := h.db.InsertAPIMetrics(ctx, batch.Metrics); err != nil {
		slog.Error("failed to insert API metrics", "error", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusAccepted)
	w.Write([]byte(`{"status":"ok"}`))
}

func (h *APICollectHandler) setCORS(w http.ResponseWriter, r *http.Request) {
	origin := r.Header.Get("Origin")
	if h.allowAll {
		w.Header().Set("Access-Control-Allow-Origin", "*")
	} else if h.allowedOrigins[origin] {
		w.Header().Set("Access-Control-Allow-Origin", origin)
	}
}

// ============================================
// PSP COLLECT HANDLER (for payment services)
// ============================================

type PSPCollectHandler struct {
	db             *storage.Postgres
	allowedOrigins map[string]bool
	allowAll       bool
}

func NewPSPCollectHandler(db *storage.Postgres, origins []string) *PSPCollectHandler {
	h := &PSPCollectHandler{
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

func (h *PSPCollectHandler) Handle(w http.ResponseWriter, r *http.Request) {
	h.setCORS(w, r)

	var batch struct {
		Metrics []model.PSPMetric `json:"metrics"`
	}
	if err := json.NewDecoder(r.Body).Decode(&batch); err != nil {
		slog.Debug("invalid request body", "error", err)
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	if len(batch.Metrics) == 0 {
		w.WriteHeader(http.StatusAccepted)
		return
	}

	// Validate timestamps
	now := time.Now().UTC()
	for i := range batch.Metrics {
		if batch.Metrics[i].Time.IsZero() {
			batch.Metrics[i].Time = now
		}
	}

	ctx := r.Context()
	if err := h.db.InsertPSPMetrics(ctx, batch.Metrics); err != nil {
		slog.Error("failed to insert PSP metrics", "error", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusAccepted)
	w.Write([]byte(`{"status":"ok"}`))
}

func (h *PSPCollectHandler) setCORS(w http.ResponseWriter, r *http.Request) {
	origin := r.Header.Get("Origin")
	if h.allowAll {
		w.Header().Set("Access-Control-Allow-Origin", "*")
	} else if h.allowedOrigins[origin] {
		w.Header().Set("Access-Control-Allow-Origin", origin)
	}
}

// ============================================
// GAME COLLECT HANDLER (for game providers)
// ============================================

type GameCollectHandler struct {
	db             *storage.Postgres
	allowedOrigins map[string]bool
	allowAll       bool
}

func NewGameCollectHandler(db *storage.Postgres, origins []string) *GameCollectHandler {
	h := &GameCollectHandler{
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

func (h *GameCollectHandler) Handle(w http.ResponseWriter, r *http.Request) {
	h.setCORS(w, r)

	var batch struct {
		Metrics []model.GameMetric `json:"metrics"`
	}
	if err := json.NewDecoder(r.Body).Decode(&batch); err != nil {
		slog.Debug("invalid request body", "error", err)
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	if len(batch.Metrics) == 0 {
		w.WriteHeader(http.StatusAccepted)
		return
	}

	// Validate timestamps
	now := time.Now().UTC()
	for i := range batch.Metrics {
		if batch.Metrics[i].Time.IsZero() {
			batch.Metrics[i].Time = now
		}
	}

	ctx := r.Context()
	if err := h.db.InsertGameMetrics(ctx, batch.Metrics); err != nil {
		slog.Error("failed to insert game metrics", "error", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusAccepted)
	w.Write([]byte(`{"status":"ok"}`))
}

func (h *GameCollectHandler) setCORS(w http.ResponseWriter, r *http.Request) {
	origin := r.Header.Get("Origin")
	if h.allowAll {
		w.Header().Set("Access-Control-Allow-Origin", "*")
	} else if h.allowedOrigins[origin] {
		w.Header().Set("Access-Control-Allow-Origin", origin)
	}
}

// ============================================
// WEBSOCKET COLLECT HANDLER
// ============================================

type WSCollectHandler struct {
	db             *storage.Postgres
	allowedOrigins map[string]bool
	allowAll       bool
}

func NewWSCollectHandler(db *storage.Postgres, origins []string) *WSCollectHandler {
	h := &WSCollectHandler{
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

func (h *WSCollectHandler) Handle(w http.ResponseWriter, r *http.Request) {
	h.setCORS(w, r)

	var batch struct {
		Metrics []model.WebSocketMetric `json:"metrics"`
	}
	if err := json.NewDecoder(r.Body).Decode(&batch); err != nil {
		slog.Debug("invalid request body", "error", err)
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	if len(batch.Metrics) == 0 {
		w.WriteHeader(http.StatusAccepted)
		return
	}

	// Validate timestamps
	now := time.Now().UTC()
	for i := range batch.Metrics {
		if batch.Metrics[i].Time.IsZero() {
			batch.Metrics[i].Time = now
		}
	}

	ctx := r.Context()
	if err := h.db.InsertWebSocketMetrics(ctx, batch.Metrics); err != nil {
		slog.Error("failed to insert WebSocket metrics", "error", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusAccepted)
	w.Write([]byte(`{"status":"ok"}`))
}

func (h *WSCollectHandler) setCORS(w http.ResponseWriter, r *http.Request) {
	origin := r.Header.Get("Origin")
	if h.allowAll {
		w.Header().Set("Access-Control-Allow-Origin", "*")
	} else if h.allowedOrigins[origin] {
		w.Header().Set("Access-Control-Allow-Origin", origin)
	}
}
