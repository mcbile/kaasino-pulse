# Product Pulse — FAQ (Frequently Asked Questions)

> Подробные ответы на частые вопросы по проекту

---

## Содержание

1. [Общие вопросы](#1-общие-вопросы)
2. [Установка и запуск](#2-установка-и-запуск)
3. [Авторизация и роли](#3-авторизация-и-роли)
4. [Dashboard и страницы](#4-dashboard-и-страницы)
5. [Фильтры и данные](#5-фильтры-и-данные)
6. [Go Collector](#6-go-collector)
7. [Frontend SDK](#7-frontend-sdk)
8. [База данных](#8-база-данных)
9. [Деплой](#9-деплой)
10. [Разработка](#10-разработка)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Общие вопросы

### Что такое Product Pulse?

Product Pulse — это система мониторинга производительности, состоящая из трёх компонентов:

| Компонент | Описание |
|-----------|----------|
| **Go Collector** | Высокопроизводительный сборщик метрик (~50k events/sec) |
| **Frontend SDK** | TypeScript SDK для браузеров (@product/pulse) |
| **Dashboard** | React-приложение для визуализации метрик |

### Какие метрики собирает система?

- **Web Vitals** — LCP, FID, CLS, INP, TTFB, FCP
- **API Performance** — latency, error rate, throughput
- **PSP (Payment Service Providers)** — success rate, transaction time
- **Game Providers** — availability, response time, ISR
- **Business Metrics** — GGR, deposits, withdrawals, sessions

### Какой стек технологий используется?

| Слой | Технологии |
|------|------------|
| Frontend | React 18, TypeScript, TanStack Query, Recharts, Tailwind CSS |
| Backend | Go 1.22, pgx/v5, slog |
| Database | TimescaleDB (PostgreSQL extension) |
| Build | Vite (frontend), Docker (backend) |
| Deploy | Render, Kubernetes |

---

## 2. Установка и запуск

### Как установить зависимости?

```bash
# Frontend (Dashboard + SDK)
npm install

# Backend (Go Collector)
go mod download
```

### Как запустить dev-сервер?

```bash
# Frontend на порту 3001
npm run dev

# Go Collector
go run ./cmd/collector
```

### Как собрать production билд?

```bash
# Frontend
npm run build

# Go Collector
go build -o pulse-collector ./cmd/collector
```

### Какие переменные окружения нужны?

```env
# Обязательные
DATABASE_URL=postgres://user:pass@localhost:5432/pulse

# Опциональные
PORT=8080                    # HTTP server port
BATCH_SIZE=100               # Events per batch
FLUSH_INTERVAL=5s            # Max time between flushes
WORKERS=4                    # Parallel batch processors
ALLOWED_ORIGINS=*            # CORS origins
DEBUG=false                  # Enable debug logging
RATE_LIMIT_RPS=100           # Requests per second per IP
ADMIN_USERS=email:hash:name:nickname  # Admin accounts
```

### Где взять пример .env файла?

```bash
cp .env.example .env
# Отредактируйте .env под ваши нужды
```

---

## 3. Авторизация и роли

### Какие роли есть в системе?

| Роль | Dashboard | User Management | Permissions Control |
|------|-----------|-----------------|---------------------|
| `super_admin` | Все страницы | Полное (add/edit/delete всех) | Может менять роли |
| `admin` | Все страницы | Только клиенты | Может вкл/выкл доступ к Finance/PSP |
| `client` | По permissions | Нет | — |

### Как войти в систему?

Три способа входа:

1. **Email + пароль** — настраивается через `ADMIN_USERS` env
2. **Nickname + пароль** — настраивается через `ADMIN_USERS` env
3. **Google OAuth** — для @starcrown.partners emails

> См. `.env.example` для примера конфигурации.

### Как добавить нового пользователя?

1. Войдите как `admin` или `super_admin`
2. Перейдите на страницу **Users**
3. Нажмите **Add User**
4. Заполните форму (email, nickname, роль)
5. Скопируйте сгенерированный пароль

### Как сбросить пароль пользователя?

1. Перейдите на страницу **Users**
2. Найдите пользователя
3. Нажмите иконку ключа (Reset Password)
4. Подтвердите действие
5. Скопируйте новый пароль

### Как настроить permissions для клиента?

1. Перейдите на страницу **Users**
2. Найдите клиента
3. Используйте переключатели **Finance** и **PSP**
4. Изменения применяются мгновенно

### Где хранятся данные авторизации?

| Ключ localStorage | Назначение |
|-------------------|------------|
| `pulse-token` | Session JWT token |
| `pulse-user` | Данные текущего пользователя |
| `pulse-managed-users` | База всех пользователей |
| `pulse-client-permissions` | Права доступа клиентов |

### Как работает Google OAuth?

1. Пользователь нажимает "Sign in with Google"
2. Google возвращает JWT credential
3. Декодируем JWT через `jwt-decode`
4. Проверяем домен email (@starcrown.partners)
5. Определяем роль по email
6. Сохраняем в localStorage

---

## 4. Dashboard и страницы

### Какие страницы есть в Dashboard?

| Страница | URL | Доступ | Описание |
|----------|-----|--------|----------|
| Overview | `/` | Все | Сводка технических метрик |
| Web Vitals | `/vitals` | Все | LCP, FID, CLS, INP |
| API | `/api` | Все | Backend endpoints performance |
| Games | `/games` | Все | Game providers + ISR статистика |
| Alerts | `/alerts` | Все | Оповещения и аномалии |
| PSP | `/psp` | Ограничен | Платёжные провайдеры |
| Finance | `/finance` | Ограничен | GGR, deposits, withdrawals |
| Users | `/users` | Admin only | Управление пользователями |

### Как работает навигация?

Навигация реализована через state в `App.tsx`, без React Router:

```typescript
const [currentPage, setCurrentPage] = useState<Page>('overview')

// В Sidebar
<button onClick={() => setCurrentPage('vitals')}>Web Vitals</button>
```

### Как работает автообновление данных?

TanStack Query автоматически обновляет данные каждые 30 секунд:

```typescript
const { data } = useQuery({
  queryKey: ['overview', ...],
  queryFn: () => mockDataAPI.getOverview(filters),
  refetchInterval: 30000, // 30 секунд
})
```

### Как свернуть/развернуть сайдбар?

- Нажмите кнопку `>>` / `<<` внизу сайдбара
- Состояние сохраняется в `localStorage.pulse-sidebar-collapsed`

### Как переключить тему (light/dark)?

- Нажмите иконку солнца/луны в UserMenu
- Состояние сохраняется в `localStorage.pulse-theme`
- По умолчанию используется системная тема

---

## 5. Фильтры и данные

### Какие фильтры доступны?

| Фильтр | Значения | По умолчанию |
|--------|----------|--------------|
| **Time Range** | 5m, 15m, 1h, 6h, 24h, 7d | 1h |
| **Brand** | All, Kaasino, Bet4star | All |
| **Country** | All, NL, GB, DE, N/A | All |

### Как применить фильтры?

1. Выберите нужные значения в селекторах
2. Нажмите кнопку **Apply**
3. Данные обновятся с учётом фильтров

### Почему нужно нажимать Apply?

Чтобы избежать лишних запросов к API при каждом изменении фильтра. Пользователь может настроить все фильтры и применить их одним запросом.

### Как работает экспорт данных?

1. Нажмите кнопку **Export** (иконка Download)
2. Выберите формат: **CSV** или **Markdown**
3. Файл скачается с учётом текущих фильтров

### Откуда берутся данные?

В текущей версии (v1.4.0) используются **mock данные** из `apiClient.ts`:

```typescript
// Детерминированная генерация на основе:
// - Текущего часа (для стабильности в пределах часа)
// - Фильтров (brand/country влияют на множители)
// - Seeded random (воспроизводимые значения)
```

### Как подключить реальный API?

Замените mock функции в `apiClient.ts` на реальные fetch запросы:

```typescript
// Было (mock)
async getOverview(filters) {
  await simulateDelay()
  return generateMockData(filters)
}

// Стало (real API)
async getOverview(filters) {
  const response = await fetch('/api/metrics/overview?' + new URLSearchParams(filters))
  return response.json()
}
```

---

## 6. Go Collector

### Как работает сборщик метрик?

1. **HTTP Handler** принимает POST запросы с событиями
2. **Batch Processor** накапливает события в буфер
3. **Workers** параллельно записывают батчи в БД
4. **COPY Protocol** обеспечивает быструю вставку

```
HTTP Request → Handler → Batch Buffer → Workers → PostgreSQL COPY
```

### Какие endpoints доступны?

| Endpoint | Method | Описание |
|----------|--------|----------|
| `/collect` | POST | Frontend SDK events |
| `/collect/api` | POST | API метрики от Go сервисов |
| `/collect/psp` | POST | PSP транзакции |
| `/collect/game` | POST | Game provider метрики |
| `/collect/ws` | POST | WebSocket метрики |
| `/health` | GET | Liveness probe |
| `/ready` | GET | Readiness probe |
| `/metrics` | GET | Статистика коллектора |

### Как настроить rate limiting?

```env
RATE_LIMIT_ENABLED=true
RATE_LIMIT_RPS=100      # Requests per second per IP
RATE_LIMIT_BURST=200    # Burst size
```

### Как ограничить размер запроса?

```env
MAX_BODY_SIZE=1048576   # 1MB по умолчанию
```

### Как использовать Go Client?

```go
import "github.com/mcbile/product-pulse/pkg/pulse"

client := pulse.NewClient(pulse.ClientConfig{
    Endpoint:      "http://pulse-collector:8080",
    SiteID:        "my-service",
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

// HTTP Middleware
handler := client.HTTPMiddleware("wallet")(yourMux)
```

---

## 7. Frontend SDK

### Как установить SDK?

```bash
npm install @product/pulse
```

### Как инициализировать SDK?

```typescript
import { Pulse } from '@product/pulse'

Pulse.init({
  endpoint: 'https://pulse-collector.example.com/collect',
  siteId: 'my-website',
  debug: true,           // Логи в консоль
  sampleRate: 1.0,       // 100% событий
  flushInterval: 5000,   // 5 секунд
  batchSize: 10,         // 10 событий в батче
})
```

### Какие методы доступны?

```typescript
// Произвольная метрика
Pulse.track('metric_name', 42, { tag: 'value' })

// Взаимодействие пользователя
Pulse.interaction('button_click', { button: 'submit' })

// Ошибка
Pulse.error(new Error('Something went wrong'), { context: 'checkout' })

// Web Vitals (автоматически)
// LCP, FID, CLS, INP, TTFB, FCP собираются автоматически
```

### Как использовать с React?

```tsx
import { PulseProvider, usePulse } from '@product/pulse/react'

// В App.tsx
<PulseProvider config={{ endpoint: '...', siteId: '...' }}>
  <App />
</PulseProvider>

// В компоненте
function MyComponent() {
  const { track, interaction, error } = usePulse()

  const handleClick = () => {
    interaction('button_click', { button: 'buy' })
  }

  return <button onClick={handleClick}>Buy</button>
}
```

### Как отключить SDK в dev режиме?

```typescript
Pulse.init({
  endpoint: '...',
  siteId: '...',
  enabled: process.env.NODE_ENV === 'production',
})
```

---

## 8. База данных

### Какая БД используется?

**TimescaleDB** — расширение PostgreSQL для временных рядов.

### Какие таблицы есть?

| Таблица | Назначение | Retention |
|---------|-----------|-----------|
| `frontend_metrics` | Web Vitals, page loads | 7 дней |
| `api_metrics` | Backend latency, errors | 14 дней |
| `psp_metrics` | Payment transactions | 90 дней |
| `game_metrics` | Game provider performance | 30 дней |
| `websocket_metrics` | WS connection quality | 7 дней |
| `business_metrics` | GGR, sessions, conversions | 365 дней |
| `alert_events` | Anomalies, threshold breaches | 90 дней |

### Как применить схему?

```bash
psql $DATABASE_URL -f product_pulse_schema.sql
```

### Как включить TimescaleDB?

```sql
CREATE EXTENSION IF NOT EXISTS timescaledb;
```

### Что такое Continuous Aggregates?

Преагрегированные данные для быстрых запросов:

| View | Интервал | Назначение |
|------|----------|------------|
| `api_performance_1m` | 1 мин | Real-time API dashboard |
| `psp_success_5m` | 5 мин | PSP health monitoring |
| `web_vitals_hourly` | 1 час | Core Web Vitals trends |
| `game_health_5m` | 5 мин | Game provider status |

### Как обновить Continuous Aggregates?

```sql
CALL refresh_continuous_aggregate('api_performance_1m', NULL, NULL);
CALL refresh_continuous_aggregate('psp_success_5m', NULL, NULL);
```

---

## 9. Деплой

### Как задеплоить на Render?

1. Создайте Blueprint на [dashboard.render.com/blueprints](https://dashboard.render.com/blueprints)
2. Подключите репозиторий
3. Выберите `render.yaml`
4. Render создаст сервисы автоматически

### Какие сервисы создаются?

| Service | Type | Plan | URL |
|---------|------|------|-----|
| `pulse-collector` | Web Service (Docker) | Starter $7 | `pulse-collector.onrender.com` |
| `pulse-dashboard` | Static Site | Free | `pulse-dashboard.onrender.com` |
| `pulse-db` | PostgreSQL 16 | Starter $7 | Internal |

### Как инициализировать БД на Render?

```bash
# 1. Включить TimescaleDB
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"

# 2. Применить схему
psql $DATABASE_URL -f product_pulse_schema.sql

# 3. Обновить aggregates
psql $DATABASE_URL -c "CALL refresh_continuous_aggregate('api_performance_1m', NULL, NULL);"
```

### Какие переменные установить в Render?

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | (автоматически от pulse-db) |
| `ALLOWED_ORIGINS` | `https://pulse-dashboard.onrender.com` |
| `DEBUG` | `false` |
| `ADMIN_USERS` | `email:hash:name:nickname` |

### Как задеплоить в Kubernetes?

```bash
# Создать namespace
kubectl create namespace pulse

# Применить манифесты
kubectl apply -f k8s/ -n pulse

# Проверить pods
kubectl get pods -n pulse
```

---

## 10. Разработка

### Как добавить новую страницу?

1. Создайте `NewPage.tsx`:

```typescript
import { useQuery } from '@tanstack/react-query'
import { useTimeRange } from './TimeRangeContext'
import { useFilters } from './App'
import { mockDataAPI } from './apiClient'
import { MetricCard, Card, SectionHeader } from './ui'

export function NewPage() {
  const { range } = useTimeRange()
  const { appliedBrand, appliedCountry } = useFilters()

  const filters = {
    brand: appliedBrand,
    country: appliedCountry,
    timeRange: range
  }

  const { data, isLoading } = useQuery({
    queryKey: ['new-page', appliedBrand, appliedCountry, range],
    queryFn: () => mockDataAPI.getNewData(filters),
    refetchInterval: 30000,
  })

  if (isLoading) return <div>Loading...</div>

  return (
    <div className="space-y-6">
      <SectionHeader title="New Page" />
      {/* Ваш контент */}
    </div>
  )
}
```

2. Обновите `App.tsx`:

```typescript
// Добавьте в импорты
import { NewPage } from './NewPage'

// Добавьте в type Page
type Page = 'overview' | 'vitals' | ... | 'newpage'

// Добавьте в pageConfig
const pageConfig = {
  // ...
  newpage: { label: 'New Page', icon: SomeIcon },
}

// Добавьте в renderPage
case 'newpage': return <NewPage />
```

### Как добавить новый контекст?

```typescript
// NewContext.tsx
import { createContext, useContext, useState, ReactNode } from 'react'

interface NewContextType {
  value: string
  setValue: (v: string) => void
}

const NewContext = createContext<NewContextType | null>(null)

export function NewProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState('')

  return (
    <NewContext.Provider value={{ value, setValue }}>
      {children}
    </NewContext.Provider>
  )
}

export function useNew() {
  const ctx = useContext(NewContext)
  if (!ctx) throw new Error('useNew must be used within NewProvider')
  return ctx
}
```

### Как добавить новый тип метрики?

1. **База данных** — добавьте таблицу в `product_pulse_schema.sql`
2. **Go Model** — обновите `internal/model/event.go`
3. **Go Handler** — добавьте endpoint в `internal/handler/handler.go`
4. **Frontend SDK** — обновите `index.ts`
5. **Dashboard API** — обновите `apiClient.ts`
6. **Dashboard UI** — создайте компоненты для отображения

### Как запустить тесты?

```bash
# Go тесты
go test ./...

# Frontend (пока нет тестов)
npm run typecheck
npm run lint
```

### Как проверить типы TypeScript?

```bash
npm run typecheck
```

### Как запустить линтер?

```bash
npm run lint
```

---

## 11. Troubleshooting

### Dashboard не загружается

1. Проверьте консоль браузера на ошибки
2. Убедитесь, что dev-сервер запущен: `npm run dev`
3. Проверьте порт: http://localhost:3001

### Не работает авторизация

1. Очистите localStorage: `localStorage.clear()`
2. Перезагрузите страницу
3. Попробуйте заново войти

### Google OAuth не работает

1. Проверьте, что используете @starcrown.partners email
2. Убедитесь, что Google OAuth Client ID настроен
3. Проверьте CORS настройки

### Данные не обновляются

1. Проверьте, что нажали **Apply** после изменения фильтров
2. Откройте Network tab — проверьте запросы
3. Попробуйте принудительно обновить: Ctrl+Shift+R

### Go Collector не запускается

1. Проверьте `DATABASE_URL`:
   ```bash
   echo $DATABASE_URL
   ```
2. Проверьте подключение к БД:
   ```bash
   psql $DATABASE_URL -c "SELECT 1"
   ```
3. Проверьте логи:
   ```bash
   DEBUG=true go run ./cmd/collector
   ```

### Ошибка "Connection refused"

1. Проверьте, что PostgreSQL/TimescaleDB запущен
2. Проверьте порт в DATABASE_URL
3. Проверьте firewall правила

### Медленные запросы к БД

1. Проверьте индексы:
   ```sql
   \d+ api_metrics
   ```
2. Обновите Continuous Aggregates:
   ```sql
   CALL refresh_continuous_aggregate('api_performance_1m', NULL, NULL);
   ```
3. Проверьте retention policies — старые данные должны удаляться

### Графики показывают пустые данные

1. Проверьте time range — возможно, данных ещё нет
2. Проверьте фильтры — возможно, слишком узкая выборка
3. Проверьте apiClient.ts — mock данные генерируются правильно?

### Экспорт не работает

1. Проверьте console на ошибки
2. Убедитесь, что данные загружены
3. Попробуйте другой браузер

### Как получить логи коллектора?

```bash
# Development
DEBUG=true go run ./cmd/collector

# Production (Docker)
docker logs pulse-collector

# Kubernetes
kubectl logs -f deployment/pulse-collector -n pulse
```

### Как проверить health коллектора?

```bash
# Liveness
curl http://localhost:8080/health

# Readiness (проверяет БД)
curl http://localhost:8080/ready

# Metrics
curl http://localhost:8080/metrics
```

---

## Контакты и поддержка

- **GitHub Issues**: [github.com/mcbile/product-pulse/issues](https://github.com/mcbile/product-pulse/issues)
- **Email**: michael@starcrown.partners

---

*Последнее обновление: v1.4.0 (2026-01-08)*
