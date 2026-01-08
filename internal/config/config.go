package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Port           string
	DatabaseURL    string
	BatchSize      int
	FlushInterval  time.Duration
	Workers        int
	AllowedOrigins []string
	Debug          bool

	// Rate limiting
	RateLimitEnabled bool
	RateLimitRPS     float64 // Requests per second per IP
	RateLimitBurst   int     // Burst size

	// Body size limit
	MaxBodySize int64 // Max request body size in bytes
}

func Load() *Config {
	return &Config{
		Port:           getEnv("PORT", "8080"),
		DatabaseURL:    getEnv("DATABASE_URL", "postgres://localhost:5432/pulse?sslmode=disable"),
		BatchSize:      getEnvInt("BATCH_SIZE", 100),
		FlushInterval:  getEnvDuration("FLUSH_INTERVAL", 5*time.Second),
		Workers:        getEnvInt("WORKERS", 4),
		AllowedOrigins: getEnvSlice("ALLOWED_ORIGINS", []string{"*"}),
		Debug:          getEnvBool("DEBUG", false),

		// Rate limiting defaults: 100 req/s per IP, burst of 200
		RateLimitEnabled: getEnvBool("RATE_LIMIT_ENABLED", true),
		RateLimitRPS:     getEnvFloat("RATE_LIMIT_RPS", 100),
		RateLimitBurst:   getEnvInt("RATE_LIMIT_BURST", 200),

		// Body size limit: 1MB default
		MaxBodySize: getEnvInt64("MAX_BODY_SIZE", 1<<20),
	}
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

func getEnvInt(key string, defaultVal int) int {
	if val := os.Getenv(key); val != "" {
		if i, err := strconv.Atoi(val); err == nil {
			return i
		}
	}
	return defaultVal
}

func getEnvBool(key string, defaultVal bool) bool {
	if val := os.Getenv(key); val != "" {
		if b, err := strconv.ParseBool(val); err == nil {
			return b
		}
	}
	return defaultVal
}

func getEnvDuration(key string, defaultVal time.Duration) time.Duration {
	if val := os.Getenv(key); val != "" {
		if d, err := time.ParseDuration(val); err == nil {
			return d
		}
	}
	return defaultVal
}

func getEnvSlice(key string, defaultVal []string) []string {
	if val := os.Getenv(key); val != "" {
		return strings.Split(val, ",")
	}
	return defaultVal
}

func getEnvFloat(key string, defaultVal float64) float64 {
	if val := os.Getenv(key); val != "" {
		if f, err := strconv.ParseFloat(val, 64); err == nil {
			return f
		}
	}
	return defaultVal
}

func getEnvInt64(key string, defaultVal int64) int64 {
	if val := os.Getenv(key); val != "" {
		if i, err := strconv.ParseInt(val, 10, 64); err == nil {
			return i
		}
	}
	return defaultVal
}
