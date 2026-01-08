# Product Pulse — Карта зависимостей Frontend v1.4.0

## Архитектурный граф

```
┌─────────────────────────────────────────────────────────────┐
│                      ENTRY POINTS                            │
├─────────────────────────────────────────────────────────────┤
│  main.tsx ──► React DOM                                      │
│  index.ts ──► SDK Exports (Pulse, PulseSDK)                 │
│  react.tsx ─► React Integration (PulseProvider, usePulse)   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  App.tsx (992 строк) — ROOT COMPONENT                        │
│    ├─► QueryClientProvider (@tanstack/react-query)          │
│    ├─► ThemeProvider (ThemeContext.tsx)                     │
│    ├─► AuthProvider (AuthContext.tsx + GoogleOAuth)         │
│    └─► ProtectedApp                                         │
│        ├─ LoginPage (если не авторизован)                   │
│        └─ Dashboard (если авторизован)                      │
│           ├─ TimeRangeProvider                              │
│           ├─ FiltersProvider (inline context)               │
│           ├─ Sidebar                                        │
│           └─ Page Content                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Иерархия провайдеров

```
<QueryClientProvider>           ← TanStack Query (кэширование данных)
  <ThemeProvider>               ← Тема light/dark
    <AuthProvider>              ← Авторизация + Google OAuth
      <GoogleOAuthProvider>
        <AuthProviderInner>
          <ProtectedApp>
            <TimeRangeProvider> ← Диапазон времени (5m–7d)
              <FiltersProvider> ← Фильтры brand/country
                <Dashboard />
              </FiltersProvider>
            </TimeRangeProvider>
          </ProtectedApp>
        </AuthProviderInner>
      </GoogleOAuthProvider>
    </AuthProvider>
  </ThemeProvider>
</QueryClientProvider>
```

---

## Контексты

| Контекст | Файл | Состояние | Потребители |
|----------|------|-----------|-------------|
| **ThemeContext** | `ThemeContext.tsx` | `theme`, `toggleTheme` | App, AuthContext, все страницы |
| **AuthContext** | `AuthContext.tsx` | `user`, `isAuthenticated`, `logout` | App, ProtectedApp, Dashboard, UserMenu |
| **TimeRangeContext** | `TimeRangeContext.tsx` | `range`, `getStartTime` | Все страницы, Header |
| **FiltersContext** | `App.tsx` (inline) | `brand`, `country`, `applyFilters` | Все страницы, ExportMenu |

---

## Страницы и их зависимости

### OverviewPage.tsx
```
├── @tanstack/react-query (useQuery)
├── TimeRangeContext (useTimeRange)
├── FiltersContext (useFilters)
├── AuthContext (useAuth)
├── apiClient (mockDataAPI.getOverview)
├── ui.tsx (MetricCard, Card, SectionHeader, StatusBadge)
└── lucide-react (Users, Activity, AlertTriangle, ...)
```

### WebVitalsPage.tsx
```
├── @tanstack/react-query (useQuery)
├── recharts (AreaChart, Area, XAxis, YAxis, Tooltip)
├── TimeRangeContext (useTimeRange)
├── FiltersContext (useFilters)
├── apiClient (mockDataAPI.getWebVitals, getWebVitalsTimeSeries)
├── ui.tsx (MetricCard, Card, SectionHeader, StatusBadge)
└── lucide-react (Gauge, Clock, LayoutShift, ...)
```

### PSPPage.tsx
```
├── @tanstack/react-query (useQuery)
├── recharts (AreaChart, PieChart, Pie, Cell)
├── TimeRangeContext (useTimeRange)
├── FiltersContext (useFilters)
├── apiClient (mockDataAPI.getPSPHealth, getPSPTimeSeries)
├── ui.tsx (MetricCard, Card, SectionHeader, StatusBadge, ProgressBar)
└── lucide-react (CreditCard, TrendingUp, Clock, AlertTriangle, ...)
```

### APIPage.tsx
```
├── @tanstack/react-query (useQuery)
├── recharts (AreaChart, BarChart)
├── TimeRangeContext (useTimeRange)
├── FiltersContext (useFilters)
├── apiClient (mockDataAPI.getAPIPerformance, getAPITimeSeries)
├── ui.tsx (MetricCard, Card, SectionHeader, StatusBadge)
└── lucide-react (Server, Clock, AlertTriangle, Activity, Loader2)
```

### GamesPage.tsx
```
├── @tanstack/react-query (useQuery)
├── recharts (AreaChart, BarChart, PieChart)
├── TimeRangeContext (useTimeRange)
├── FiltersContext (useFilters)
├── apiClient (mockDataAPI.getGameProviders, getGameHealth, getGameTimeSeries)
├── ui.tsx (MetricCard, Card, SectionHeader, StatusBadge, ProgressBar)
└── lucide-react (Gamepad2, TrendingUp, Clock, ...)
```

### AlertsPage.tsx
```
├── @tanstack/react-query (useQuery, useMutation, useQueryClient)
├── apiClient (mockData.alerts)
├── ui.tsx (Card, SectionHeader, StatusBadge)
└── lucide-react (AlertTriangle, CheckCircle, Clock, Bell, BellOff)
```

### FinancePage.tsx
```
├── @tanstack/react-query (useQuery)
├── recharts (AreaChart, BarChart, Bar)
├── TimeRangeContext (useTimeRange)
├── FiltersContext (useFilters)
├── apiClient (mockDataAPI.getOverview, getPSPHealth, getSessionsTimeSeries)
├── ui.tsx (MetricCard, Card, SectionHeader, ProgressBar)
└── lucide-react (DollarSign, TrendingUp, Users, ...)
```

### UsersPage (inline в App.tsx)
```
├── useState, useEffect (React)
├── AuthContext (useAuth)
├── localStorage (pulse-managed-users, pulse-client-permissions)
└── lucide-react (Users, Plus, Edit, Trash2, Key, ...)
```

---

## UI Компоненты

### ui.tsx (252 строки)
```typescript
export function MetricCard({ title, value, subtitle, trend, icon, status })
export function StatusBadge({ status, label })
export function ProgressBar({ value, max, color, size, showLabel })
export function Sparkline({ data, color, height })
export function SectionHeader({ title, subtitle, action })
export function Card({ children, className, padding })
export function Skeleton({ className })
export function MetricCardSkeleton()
```

### components.tsx (80+ строк)
```typescript
// Альтернативные реализации MetricCard
// Legacy код, может быть удалён
```

---

## API Client

### apiClient.ts (547 строк)

**Типы:**
```typescript
interface Alert { ... }
interface FilterParams { brand?, country?, timeRange? }
interface PSPHealth { ... }
interface MetricEvent { ... }
```

**Утилиты:**
```typescript
simulateDelay()           // Имитация сетевой задержки 300-800ms
seededRandom(seed)        // Детерминированный random
hashString(str)           // Хэш для seed
getFilterMultiplier()     // 1.2× Kaasino, 0.8× Bet4star
generateTimeSeries()      // Генерация данных для графиков
```

**API методы:**
```typescript
mockDataAPI.getOverview(filters)
mockDataAPI.getPSPHealth(filters)
mockDataAPI.getPSPTimeSeries(filters)
mockDataAPI.getAPIPerformance(filters)
mockDataAPI.getAPITimeSeries(filters)
mockDataAPI.getWebVitals(filters)
mockDataAPI.getWebVitalsTimeSeries(filters)
mockDataAPI.getGameProviders(filters)
mockDataAPI.getGameHealth(filters)
mockDataAPI.getGameTimeSeries(filters)
mockDataAPI.getAlerts(filters)
mockDataAPI.getSessionsTimeSeries(filters)
mockDataAPI.getLatencyTimeSeries(filters)
```

---

## Внешние зависимости

### Production

| Пакет | Версия | Назначение |
|-------|--------|------------|
| `react` | ^18.2.0 | UI библиотека |
| `react-dom` | ^18.2.0 | DOM рендеринг |
| `@tanstack/react-query` | ^5.0.0 | Data fetching & caching |
| `recharts` | ^2.10.0 | Графики (Area, Bar, Pie, Line) |
| `lucide-react` | ^0.562.0 | 80+ SVG иконок |
| `@react-oauth/google` | ^0.13.4 | Google OAuth |
| `jwt-decode` | ^4.0.0 | JWT декодирование |

### Dev Dependencies

| Пакет | Версия | Назначение |
|-------|--------|------------|
| `typescript` | ^5.3.0 | Язык |
| `vite` | ^5.0.0 | Build tool & dev server |
| `@vitejs/plugin-react` | ^4.2.0 | Vite React plugin |
| `tailwindcss` | ^3.4.0 | CSS framework |
| `postcss` | ^8.4.0 | CSS processing |
| `autoprefixer` | ^10.4.0 | CSS vendor prefixing |
| `tsup` | ^8.0.0 | Bundler для SDK |
| `@types/react` | ^18.2.0 | React типы |
| `@types/react-dom` | ^18.2.0 | React DOM типы |
| `@types/node` | ^20.0.0 | Node типы |

---

## LocalStorage

| Ключ | Тип | Назначение |
|------|-----|------------|
| `pulse-token` | string | Session JWT token |
| `pulse-user` | JSON | `{ email, name, nickname, picture, role }` |
| `pulse-theme` | string | `'light'` или `'dark'` |
| `pulse-managed-users` | JSON | `{ [email]: { email, name, nickname, role, password } }` |
| `pulse-registered-users` | JSON | Legacy формат пользователей |
| `pulse-client-permissions` | JSON | `{ [email]: { finance, psp } }` |
| `pulse-sidebar-collapsed` | string | `'true'` или `'false'` |

---

## Query Cache Keys (TanStack Query)

```javascript
// Overview
['overview', timeStart, brand, country]

// Web Vitals
['web-vitals', brand, country, range]

// PSP
['psp-health', brand, country, range]
['psp-timeseries', brand, country, range]

// API
['api-performance', brand, country, range]
['api-timeseries', brand, country, range]

// Games
['game-providers', brand, country, range]
['game-health', brand, country, range]
['game-timeseries', brand, country, range]

// Alerts
['alerts']

// Finance
['finance-overview', brand, country, range]
['finance-psp', brand, country, range]
['finance-sessions-ts', brand, country, range]
['finance-latency-ts', brand, country, range]
```

---

## Размеры файлов

| Файл | Строк | Тип |
|------|-------|-----|
| `App.tsx` | 992 | Container |
| `AuthContext.tsx` | 552 | Context |
| `apiClient.ts` | 547 | Utility |
| `index.ts` (SDK) | 495 | SDK |
| `ui.tsx` | 252 | Components |
| `components.tsx` | 80+ | Components |
| `ThemeContext.tsx` | 75 | Context |
| `TimeRangeContext.tsx` | 60 | Context |
| `Sidebar.tsx` | 74 | Component |
| `Header.tsx` | 52 | Component |
| Страницы (×7) | ~350 | Pages |
| **Итого** | **~6600** | — |

---

## Граф импортов

```
main.tsx
└── App.tsx
    ├── @tanstack/react-query
    ├── ThemeContext.tsx
    │   └── (только useContext)
    ├── AuthContext.tsx
    │   ├── @react-oauth/google
    │   ├── jwt-decode
    │   └── ThemeContext (useTheme)
    ├── TimeRangeContext.tsx
    │   └── (только useContext)
    ├── FiltersContext (INLINE)
    ├── OverviewPage.tsx
    │   ├── @tanstack/react-query
    │   ├── TimeRangeContext
    │   ├── App (useFilters)
    │   ├── AuthContext
    │   ├── apiClient
    │   └── ui.tsx
    ├── WebVitalsPage.tsx → аналогичный паттерн
    ├── PSPPage.tsx → аналогичный паттерн
    ├── APIPage.tsx → аналогичный паттерн
    ├── GamesPage.tsx → аналогичный паттерн
    ├── AlertsPage.tsx → аналогичный паттерн
    ├── FinancePage.tsx → аналогичный паттерн
    └── UsersPage (INLINE в App.tsx)

ui.tsx / components.tsx
├── react (ReactNode)
└── lucide-react (иконки)

apiClient.ts
└── БЕЗ ВНЕШНИХ ИМПОРТОВ (чистый TypeScript)
```

---

## Custom Hooks

```typescript
useAuth()       // AuthContext.tsx — авторизация
useTheme()      // ThemeContext.tsx — тема
useTimeRange()  // TimeRangeContext.tsx — диапазон времени
useFilters()    // App.tsx (inline) — фильтры brand/country
usePulse()      // react.tsx — SDK интеграция
```

---

## Иерархия рендеринга

```
<App>
├── <QueryClientProvider>
│   └── <ThemeProvider>
│       └── <AuthProvider>
│           └── <GoogleOAuthProvider>
│               └── <AuthProviderInner>
│                   └── <ProtectedApp>
│                       ├── <LoginPage /> (если не авторизован)
│                       └── <TimeRangeProvider>
│                           └── <FiltersProvider>
│                               └── <Dashboard>
│                                   ├── <Sidebar>
│                                   │   ├── Logo ("M" + "Pulse")
│                                   │   ├── Navigation buttons
│                                   │   └── Collapse button
│                                   └── <main>
│                                       ├── <Header>
│                                       │   ├── <TimeRangeSelector>
│                                       │   ├── <BrandSelector>
│                                       │   ├── <CountrySelector>
│                                       │   ├── <ApplyFiltersButton>
│                                       │   ├── <ExportMenu>
│                                       │   └── <UserMenu>
│                                       └── Page Content
│                                           └── <*Page>
│                                               ├── <MetricCard>
│                                               ├── <Card>
│                                               ├── <SectionHeader>
│                                               ├── <StatusBadge>
│                                               ├── <ProgressBar>
│                                               └── <*Chart> (recharts)
```

---

## Рекомендации по рефакторингу

1. **FiltersContext** — переместить из `App.tsx` в отдельный файл
2. **ExportMenu** — выделить в отдельный компонент
3. **UsersPage** — выделить из `App.tsx` в отдельный файл
4. **Page Components** — унифицировать паттерны (много дублирования)
5. **API Client** — создать реальный API слой вместо mock
6. **Routing** — добавить React Router вместо state-based навигации
7. **Testing** — добавить unit/integration тесты
