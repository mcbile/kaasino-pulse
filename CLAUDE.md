# CLAUDE.md — Instructions for Claude Code for Product Pulse

> **UNBREAKABLE RULES** — Follow these instructions for every code change.

## Related Documentation

- [FAQ.md](./FAQ.md) — Frequently Asked Questions
- [DEPENDENCIES.md](./DEPENDENCIES.md) — Frontend dependency map
- [README.md](./README.md) — Project overview

---

## Impact Analysis (MANDATORY)

**BEFORE any code change**, you must:

1. **Describe current state** — how code works now
2. **Describe proposed changes** — what exactly will change
3. **Explain impact on final code:**
   - Which files/functions affected
   - How behavior changes
   - Performance impact (if applicable)
   - Potential risks
4. **Get confirmation** from user before implementing

```
⚠️ RULE: Never make changes without explaining their impact
   on the final code. User must understand WHAT changes
   and HOW it affects the system.
```

### Change Proposal Format

```markdown
### Current code:
[code fragment]

### Proposed code:
[code fragment]

### Impact:
- Files: [list of affected files]
- Functions: [list of affected functions]
- Performance: [description]
- Risks: [description]
```

—

## Language

**Всегда отвечай на русском языке.**

---

## Project Overview

**Product Pulse** — система мониторинга производительности. Состоит из трёх компонентов:

1. **Go Collector** — высокопроизводительный сборщик метрик (~50k events/sec)
2. **Frontend SDK** — TypeScript SDK для браузеров (@product/pulse-sdk)
3. **Dashboard** — React-приложение для визуализации метрик

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Frontend SDK   │────▶│   Go Collector  │────▶│   TimescaleDB   │
│  (browser)      │     │   (this repo)   │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               ▲
┌─────────────────┐            │
│  Go Services    │────────────┘
│  (internal)     │
└─────────────────┘
```

---

## Tech Stack

| Component | Technologies |
|-----------|--------------|
| **Collector** | Go 1.22, pgx/v5 (PostgreSQL driver), slog |
| **SDK** | TypeScript, tsup (bundler) |
| **Dashboard** | React, TanStack Query, Tailwind CSS, Vite |
| **Database** | TimescaleDB (PostgreSQL extension) |
| **Deploy** | Docker, Kubernetes |

---

## Commands

```bash
# Go Collector
go run ./cmd/collector       # Запуск коллектора
go build -o pulse-collector  # Сборка
go test ./...                # Тесты

# Frontend SDK
npm install                  # Установка зависимостей
npm run build                # Сборка SDK (cjs + esm + dts)
npm run dev                  # Watch mode
npm run lint                 # ESLint
npm run typecheck            # TypeScript проверка

# Docker
docker-compose up -d         # Запуск с БД
```

---

## Configuration (Environment Variables)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | HTTP server port |
| `DATABASE_URL` | - | PostgreSQL connection string |
| `BATCH_SIZE` | `100` | Events per batch |
| `FLUSH_INTERVAL` | `5s` | Max time between flushes |
| `WORKERS` | `4` | Parallel batch processors |
| `ALLOWED_ORIGINS` | `*` | CORS origins |
| `DEBUG` | `false` | Enable debug logging |
| `RATE_LIMIT_ENABLED` | `true` | Enable rate limiting |
| `RATE_LIMIT_RPS` | `100` | Requests per second per IP |
| `RATE_LIMIT_BURST` | `200` | Burst size for rate limiter |
| `MAX_BODY_SIZE` | `1048576` | Max request body size (1MB) |

---

## API Endpoints

### Core Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/collect` | POST | Приём событий от Frontend SDK |
| `/health` | GET | Liveness probe |
| `/ready` | GET | Readiness probe (проверка БД) |
| `/metrics` | GET | Статистика коллектора |

### Go Client Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/collect/api` | POST | API метрики от Go сервисов |
| `/collect/psp` | POST | PSP транзакции |
| `/collect/game` | POST | Game provider метрики |
| `/collect/ws` | POST | WebSocket метрики |

### Dashboard API
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/metrics/overview` | GET | Сводка всех метрик |
| `/api/metrics/api` | GET | API performance |
| `/api/metrics/api/timeseries` | GET | API latency time series |
| `/api/metrics/psp` | GET | PSP health |
| `/api/metrics/psp/timeseries` | GET | PSP success rate time series |
| `/api/metrics/vitals` | GET | Web Vitals |
| `/api/metrics/vitals/timeseries` | GET | Web Vitals time series |
| `/api/metrics/games` | GET | Game provider health |
| `/api/metrics/games/timeseries` | GET | Game success rate time series |
| `/api/alerts` | GET | Список алертов |
| `/api/alerts/{time}/acknowledge` | POST | Подтвердить алерт |

### Authentication API
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Вход (email/nickname + password) |
| `/api/auth/logout` | POST | Выход (invalidate token) |
| `/api/auth/verify` | GET | Проверка токена сессии |

---

## Database Schema (TimescaleDB)

### Core Hypertables

| Table | Purpose | Retention |
|-------|---------|-----------|
| `frontend_metrics` | Web Vitals, page loads | 7 days |
| `api_metrics` | Backend latency, errors | 14 days |
| `psp_metrics` | Payment provider metrics | 90 days |
| `game_metrics` | Game provider performance | 30 days |
| `websocket_metrics` | WS connection quality | 7 days |
| `business_metrics` | GGR, sessions, conversions | 365 days |
| `alert_events` | Anomalies, threshold breaches | 90 days |

### Continuous Aggregates

| View | Interval | Use Case |
|------|----------|----------|
| `api_performance_1m` | 1 min | Real-time API dashboard |
| `psp_success_5m` | 5 min | PSP health monitoring |
| `web_vitals_hourly` | 1 hour | Core Web Vitals trends |
| `game_health_5m` | 5 min | Game provider status |

---

## Architecture

### Go Collector Structure

```
cmd/
└── collector/
    └── main.go              # Entry point

internal/
├── collector/
│   └── batch.go             # Batch processing, workers
├── config/
│   └── config.go            # Environment config
├── handler/
│   ├── handler.go           # Collect + health handlers
│   ├── dashboard.go         # Dashboard API handlers
│   └── auth.go              # Authentication handlers
├── middleware/
│   ├── ratelimit.go         # Per-IP rate limiting
│   └── bodysize.go          # Request body size limit
├── model/
│   └── event.go             # Event types
└── storage/
    └── postgres.go          # PostgreSQL COPY + queries

pkg/
└── pulse/
    └── client.go            # Go client library
```

### Dashboard Pages

| Page | Component | Description |
|------|-----------|-------------|
| Overview | `OverviewPage.tsx` | Сводка технических метрик |
| Web Vitals | `WebVitalsPage.tsx` | LCP, FID, CLS, INP |
| PSP | `PSPPage.tsx` | Платёжные провайдеры |
| API | `APIPage.tsx` | Backend endpoints |
| Games | `GamesPage.tsx` | Game providers + ISR статистика |
| Alerts | `AlertsPage.tsx` | Оповещения |
| Finance | `FinancePage.tsx` | Финансовые метрики (GGR, deposits) |
| Users | `UsersPage` (в App.tsx) | Управление пользователями |

---

## Authentication & Roles

### Роли пользователей

| Role | Dashboard Access | User Management | Permissions Control |
|------|-----------------|-----------------|---------------------|
| `super_admin` | Все страницы | Полное (add/edit/delete всех) | Может менять роли |
| `admin` | Все страницы | Только клиенты | Может вкл/выкл доступ к Finance/PSP |
| `client` | По permissions | Нет | — |

### Методы входа

| Метод | Описание |
|-------|----------|
| Email + пароль | `michael@starcrown.partners` / `Pulse4me!` |
| Nickname + пароль | `mcbile` / `Pulse4me!` |
| Google OAuth | Для @starcrown.partners emails |

### Environment Variables (Auth)

| Variable | Default | Description |
|----------|---------|-------------|
| `ADMIN_USERS` | — | Формат: `email:hash:name:nickname,email2:...` |

### Default Super Admin
- **Email**: `michael@starcrown.partners`
- **Nickname**: `McBile`
- **Password**: `Pulse4me!`

---

## Key Metrics

### Web Vitals (Frontend)
- **LCP** (Largest Contentful Paint) — target <2.5s
- **FID** (First Input Delay) — target <100ms
- **CLS** (Cumulative Layout Shift) — target <0.1
- **INP** (Interaction to Next Paint) — target <200ms
- **TTFB** (Time to First Byte)
- **FCP** (First Contentful Paint)

### PSP Metrics
- Success rate (%)
- Average latency (ms)
- P95/P99 latency
- Transaction volume

### API Metrics
- Request count
- Error rate (4xx, 5xx)
- Average/P95/P99 duration
- Throughput (req/sec)

---

## Go Client Usage

```go
import "github.com/mcbile/product-pulse/pkg/pulse"

client := pulse.NewClient(pulse.ClientConfig{
    Endpoint:      "http://pulse-collector:8080",
    SiteID:        "product-internal",
    FlushInterval: 5 * time.Second,
    BatchSize:     50,
})
defer client.Close()

// Track API call
client.TrackAPI(pulse.APIMetric{
    ServiceName: "wallet",
    Endpoint:    "/api/v1/deposit",
    Method:      "POST",
    DurationMS:  45.2,
    StatusCode:  200,
})

// Track PSP transaction
client.TrackPSP(pulse.PSPMetric{
    PSPName:    "pix",
    Operation:  "deposit",
    DurationMS: 1234.5,
    Success:    true,
    Amount:     pulse.Float64Ptr(100.00),
    Currency:   pulse.StringPtr("BRL"),
})

// HTTP Middleware
handler := client.HTTPMiddleware("wallet")(mux)
```

---

## File Structure

```
product-pulse/
├── cmd/
│   └── collector/
│       └── main.go              # Go collector entry point
├── internal/
│   ├── collector/batch.go       # Batch processing
│   ├── config/config.go         # Configuration
│   ├── handler/
│   │   ├── handler.go           # HTTP handlers
│   │   └── dashboard.go         # Dashboard API
│   ├── middleware/
│   │   ├── ratelimit.go         # Rate limiting
│   │   └── bodysize.go          # Body size limit
│   ├── model/event.go           # Event models
│   └── storage/postgres.go      # Database layer
├── pkg/
│   └── pulse/client.go          # Go client library
│
├── index.ts                     # TypeScript SDK entry
├── client.ts                    # SDK client
├── react.tsx                    # React SDK wrapper
│
├── App.tsx                      # Dashboard root + UsersPage
├── index.tsx                    # React entry point
├── OverviewPage.tsx             # Overview dashboard (technical metrics)
├── WebVitalsPage.tsx            # Web Vitals page
├── PSPPage.tsx                  # PSP health page
├── APIPage.tsx                  # API performance page
├── GamesPage.tsx                # Game providers + ISR statistics
├── AlertsPage.tsx               # Alerts page
├── FinancePage.tsx              # Financial metrics (GGR, deposits)
├── Header.tsx                   # Header component
├── AuthContext.tsx              # Authentication (login, logout, Google OAuth)
├── ThemeContext.tsx             # Light/dark theme
├── TimeRangeContext.tsx         # Time range selector
├── apiClient.ts                 # API client + mock data
├── components.tsx               # Shared components
├── ui.tsx                       # UI primitives (cards, badges, etc.)
│
├── index.css                    # Global styles + Tailwind
├── index.html                   # HTML template
├── product_pulse_schema.sql     # Database schema
├── docker-compose.yml           # Local development
├── Dockerfile                   # Container build
├── render.yaml                  # Render deployment config
├── package.json                 # Node dependencies
├── go.mod                       # Go dependencies
├── vite.config.ts               # Vite config
├── tailwind.config.js           # Tailwind config
├── tsconfig.json                # TypeScript config
├── .env.example                 # Environment variables template
└── .gitignore                   # Git ignore rules
```

---

## Performance Targets

| Metric | Target |
|--------|--------|
| Collector throughput | ~50,000 events/sec |
| Avg flush time | 10-15ms per 100 events |
| Memory baseline | ~50MB |
| CPU at 10k events/sec | <5% |

---

## Render Deployment

### Быстрый деплой

```bash
# 1. Создай проект на Render через Blueprint
#    https://dashboard.render.com/blueprints
#    Подключи репозиторий и выбери render.yaml

# 2. После создания БД — инициализируй схему
./scripts/init-render-db.sh $DATABASE_URL

# 3. Проверь деплой
curl https://pulse-collector.onrender.com/health
curl https://pulse-collector.onrender.com/metrics
```

### Структура сервисов на Render

| Service | Type | Plan | URL |
|---------|------|------|-----|
| `pulse-collector` | Web Service (Docker) | Starter $7 | `pulse-collector.onrender.com` |
| `pulse-dashboard` | Static Site | Free | `pulse-dashboard.onrender.com` |
| `pulse-db` | PostgreSQL 16 | Starter $7 | Internal |

### Environment Variables

Установи в Render Dashboard:

| Variable | Value |
|----------|-------|
| `ALLOWED_ORIGINS` | `https://pulse-dashboard.onrender.com` |
| `DEBUG` | `false` (production) |

### После деплоя

```bash
# Включи TimescaleDB (один раз)
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"

# Применить схему
psql $DATABASE_URL -f product_pulse_schema.sql

# Обновить continuous aggregates
psql $DATABASE_URL -c "CALL refresh_continuous_aggregate('api_performance_1m', NULL, NULL);"
```

---

## Common Tasks

### Добавление нового типа метрики

1. Добавь таблицу в `product_pulse_schema.sql`
2. Создай hypertable с `create_hypertable()`
3. Добавь retention policy
4. Добавь compression policy
5. Создай continuous aggregate (если нужно)
6. Добавь индексы для частых запросов
7. Обнови `event.go` с новым типом
8. Добавь handler в `handler.go`
9. Обнови SDK в `client.ts`

### Добавление страницы в Dashboard

1. Создай `NewPage.tsx` с компонентом
2. Добавь роут в `App.tsx` (type Page)
3. Добавь пункт в `Sidebar.tsx`
4. Создай queries с TanStack Query

---

## Development Tips

- Dashboard автообновляется каждые 30 секунд (`refetchInterval: 30000`)
- Используй `DEBUG=true` для подробных логов коллектора
- Для локальной разработки: `docker-compose up -d` поднимет TimescaleDB
- Continuous aggregates нужно обновлять вручную при первом запуске:
  ```sql
  CALL refresh_continuous_aggregate('api_performance_1m', NULL, NULL);
  ```

---

## Changelog

### v1.4.0 (2026-01-08)
- **Project Rename** — полный ренейминг проекта
  - Kaasino Pulse → Product Pulse
  - Go module: `github.com/mcbile/product-pulse`
  - NPM package: `@product/pulse`
  - Docker image: `mcbile/product-pulse`
  - SQL schema: `product_pulse_schema.sql`
- **Logo Update** — логотип "M" + "Product"
- **Deterministic Charts** — графики теперь детерминированные (seeded random)
- **Export Fix** — исправлен экспорт с учётом фильтров
- **PSP View All** — раскрывающийся список failed transactions
- **Super Admin Badge** — фиолетовый бейдж для super_admin
- **Permissions UI** — статичные permissions для super_admin

### v1.3.0 (2026-01-07)
- **Backend Authentication** — Go backend для безопасной аутентификации
  - `/api/auth/login`, `/api/auth/logout`, `/api/auth/verify` endpoints
  - Session tokens с 24h expiry
  - Password hashing (SHA256)
  - Убраны hardcoded credentials из frontend
- **Role-Based Access Control** — три роли с разными правами:
  - `super_admin` — полный доступ + управление пользователями
  - `admin` — полный доступ к dashboard + управление клиентами
  - `client` — ограниченный доступ (по permissions)
- **User Management Page** — страница управления пользователями (для admin/super_admin):
  - Добавление пользователей с генерацией пароля
  - Редактирование nickname, email, роли
  - Сброс пароля
  - Удаление пользователей
  - Управление permissions (Finance, PSP доступ)
- **Finance Page** — отдельная страница для финансовых метрик (GGR, deposits, withdrawals)
- **Games ISR Statistics** — добавлена ISR (Instant Success Rate) статистика по провайдерам
- **Auth Sync** — синхронизация между методами входа (email/nickname/Google OAuth)
- Environment variable: `ADMIN_USERS` для настройки admin accounts

### v1.2.1 (2026-01-07)
- **Dashboard Authentication** — frontend авторизация (Google OAuth + email/password)
- AuthContext с LoginPage и UserMenu
- Защита Dashboard через ProtectedApp wrapper

### v1.2.0 (2026-01-07)
- **Dashboard Redesign** — новый дизайн на основе MAE IDP
- Переключатель светлой/тёмной темы
- Фильтры по брендам (Kaasino, Bet4star) и странам (NL, GB, DE, N/A)
- Кнопка "Apply" для применения фильтров
- Экспорт метрик в CSV и Markdown
- Графики реагируют на применённые фильтры
- Ребрендинг: Kaasino Pulse → Product Pulse
- ThemeContext для управления темой
- FiltersContext для управления фильтрами
- Обновлённые UI компоненты (ui.tsx)

### v1.1.0 (2026-01-06)
- **BREAKING**: Реструктуризация проекта — стандартная Go структура (`cmd/`, `internal/`, `pkg/`)
- Go Client endpoints для внутренних сервисов (`/collect/api`, `/collect/psp`, `/collect/game`, `/collect/ws`)
- Dashboard API endpoints для чтения метрик (`/api/metrics/*`, `/api/alerts`)
- Rate limiting middleware (per-IP, настраиваемый RPS и burst)
- Body size limit middleware (защита от OOM атак)
- Новые конфиг-переменные: `RATE_LIMIT_*`, `MAX_BODY_SIZE`

### v1.0.0 (Initial Release)
- Go Collector с batch processing и COPY protocol
- Frontend SDK (@product/pulse-sdk) для Web Vitals
- Dashboard с 6 страницами (Overview, Web Vitals, PSP, API, Games, Alerts)
- TimescaleDB схема с 7 hypertables
- Continuous aggregates для real-time дашбордов
- Docker + Kubernetes deployment
- Go client library с HTTP middleware

---

## Backlog

### High Priority
- [ ] **Alerting system** — настраиваемые пороги и уведомления (Slack, Telegram, PagerDuty)
- [ ] **User sessions tracking** — связь метрик с конкретными сессиями игроков
- [ ] **Anomaly detection** — автоматическое обнаружение аномалий в метриках
- [ ] **Database user storage** — хранение пользователей в PostgreSQL вместо localStorage
- [ ] **GeoIP integration** — определение страны по IP (MaxMind GeoIP2)

### Medium Priority
- [ ] **Grafana integration** — экспорт метрик в Grafana
- [ ] **Custom dashboards** — возможность создавать свои дашборды
- [ ] **Retention configuration UI** — управление retention через UI
- [ ] **Mobile SDK** — React Native / Flutter SDK
- [ ] **Sampling configuration** — настраиваемый sampling для высоконагруженных эндпоинтов
- [ ] **Password change** — возможность пользователю сменить свой пароль
- [ ] **Live status indicators** — индикаторы "System OK" (проверка /health) и "Live" (real-time updates)

### Low Priority
- [ ] **Multi-tenancy** — поддержка нескольких сайтов в одной инсталляции
- [ ] **Historical comparisons** — сравнение метрик week-over-week, month-over-month
- [ ] **SLA reporting** — автоматические отчёты по SLA
- [ ] **Integration tests** — E2E тесты для collector + dashboard
- [ ] **OpenTelemetry support** — интеграция с OTEL для трейсинга

### Technical Debt
- [ ] Покрыть Go код unit-тестами (target: 80%)
- [ ] Добавить E2E тесты для Dashboard
- [ ] Документация API (OpenAPI/Swagger)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Helm chart для Kubernetes
- [ ] Использовать bcrypt вместо SHA256 для паролей

### GitHub Actions CI/CD
- [ ] **Go CI** — unit tests, race detector, coverage upload (codecov)
- [ ] **Go Lint** — golangci-lint для статического анализа
- [ ] **Go Security** — gosec для поиска уязвимостей
- [ ] **Frontend CI** — typecheck, eslint, build SDK
- [ ] **Integration Tests** — тесты с TimescaleDB в Docker service
- [ ] **Docker Build** — сборка и push образа в registry
- [ ] **Schema Validation** — проверка SQL миграций на чистой БД

### Completed (v1.4.0)
- [x] Project Rename (Kaasino Pulse → Product Pulse)
- [x] Go module update (github.com/mcbile/product-pulse)
- [x] Logo "M" + "Product"
- [x] Deterministic charts (seeded random)
- [x] Export with filters
- [x] PSP View All button
- [x] Super admin purple badge
- [x] Static permissions for super_admin

### Completed (v1.3.0)
- [x] Backend Authentication (Go auth handler)
- [x] Role-Based Access Control (super_admin, admin, client)
- [x] User Management Page (add/edit/delete users)
- [x] Finance Page (отдельная страница для финансов)
- [x] Games ISR Statistics (статистика по провайдерам)
- [x] Auth Sync (синхронизация email/nickname/Google OAuth)
- [x] Permissions system (Finance, PSP access control)

### Completed (v1.2.1)
- [x] Dashboard Authentication (AuthContext, LoginPage, UserMenu)
- [x] ProtectedApp wrapper для защиты дашборда
- [x] Google OAuth integration

### Completed (v1.2.0)
- [x] Dashboard Redesign (MAE IDP дизайн)
- [x] Light/Dark theme toggle
- [x] Brand/Country filters
- [x] Export to CSV/Markdown
- [x] Ребрендинг → Product Pulse

### Completed (v1.1.0)
- [x] Реструктуризация Go проекта (cmd/internal/pkg)
- [x] Go Client endpoints (/collect/api, /psp, /game, /ws)
- [x] Dashboard API endpoints (/api/metrics/*, /api/alerts)
- [x] Rate limiting middleware
- [x] Body size limit middleware
- [x] CORS для Dashboard API
