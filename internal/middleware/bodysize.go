package middleware

import (
	"net/http"
)

// BodySizeLimiter limits request body size
type BodySizeLimiter struct {
	maxSize int64
}

// NewBodySizeLimiter creates a new body size limiter
func NewBodySizeLimiter(maxSize int64) *BodySizeLimiter {
	return &BodySizeLimiter{maxSize: maxSize}
}

// Middleware returns HTTP middleware that limits request body size
func (bsl *BodySizeLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if bsl.maxSize > 0 && r.Body != nil {
			r.Body = http.MaxBytesReader(w, r.Body, bsl.maxSize)
		}
		next.ServeHTTP(w, r)
	})
}
