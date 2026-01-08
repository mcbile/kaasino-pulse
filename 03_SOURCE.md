---
font: monospace
header-color: blue
---

# 📊 Unified Field Glossary & Metrics

> **Canonical Reference** — центральный глоссарий всех полей данных.
> **Sources:** Customer.io (CIO), PostgreSQL (POST), Intercom (INT)

## Related Documents

| Document | Purpose | Link |
|----------|---------|------|
| **04_SOURCE_CIO.md** | Customer.io API: endpoints, attributes, segments, campaigns, tags | [→ 04_SOURCE_CIO.md](04_SOURCE_CIO.md) |
| **05_SOURCE_POSTQ.md** | PostgreSQL: views, SQL queries, Complete Player Query | [→ 05_SOURCE_POSTQ.md](05_SOURCE_POSTQ.md) |

---

## 1. Идентификация (Identification)

| # | Field | Type | CIO Source | POST Source | Priority | Description |
|:-:|:------|:-----|:-----------|:------------|:--------:|:------------|
| 1 | `user_id` | bigint | `id` (kaasino:{id}) | `users_view.id` | CIO | Уникальный ID игрока (PK) |
| 2 | `email` | string | `email` | ❌ | CIO | Email адрес |
| 3 | `phone` | string | `phone` | ❌ | CIO | Телефон (+XX XXX XXXXXX) |
| 4 | `cio_id` | string | `cio_id` | `users_view.customerio` | CIO | Internal CIO ID (hex) |
| 5 | `wallet_id` | bigint | ❌ | `accounts_view.id` | POST | Account ID (≠ wallet address) |
| 6 | `intercom_id` | string | — | — | INT | Intercom ID |
| 7 | `brand` | string | — | — | XLSX | Название бренда (Kaasino, etc.) |

---

## 2. Профиль (Profile)

| # | Field | Type | CIO Source | POST Source | Priority | Description |
|:-:|:------|:-----|:-----------|:------------|:--------:|:------------|
| 8 | `first_name` | string | `first_name` | `profiles_view.first_name` | POST | Имя |
| 9 | `last_name` | string | `last_name` | `profiles_view.last_name` | POST | Фамилия |
| 10 | `country` | string | `country` | `profiles_view.country` | POST | Страна регистрации (2-letter ISO: NL, DE) |
| 11 | `city` | string | ❌ | `profiles_view.city` | POST | Город |
| 12 | `gender` | string | `gender` | `profiles_view.gender` | POST | Пол (m/f) |
| 13 | `dob` | date | `date_of_birth` (Unix) | `profiles_view_2.date_of_birth` | POST | Дата рождения |
| 14 | `locale` | string | `locale` | `profiles_view.language` | CIO | Локаль (en, de, nl) |
| 15 | `language` | string | `locale` | `profiles_view.language` | POST | Язык интерфейса (alias of locale) |
| 16 | `timezone` | string | `timezone` | `profiles_view_2.time_zone` | POST | Часовой пояс |
| 17 | `currency` | string | `currency` | `accounts_view.currency` | CIO | Валюта счёта (EUR, GBP) |

---

## 3. Статус аккаунта (Account Status)

| # | Field | Type | CIO Source | POST Source | Priority | Description |
|:-:|:------|:-----|:-----------|:------------|:--------:|:------------|
| 18 | `reg_dt` | timestamp | `created_at` | `users_view.created_at` | CIO | Дата регистрации |
| 19 | `verified_email` | timestamp | `confirmed_at` | `users_view.confirmed_at` | CIO | Дата подтверждения email |
| 20 | `disabled` | bool | `disabled` (enum) | `users_view.locked_at` IS NOT NULL | CIO | Заблокирован |
| 21 | `closed_reason` | string | ❌ | `user_deactivations_view.reason` | POST | Причина блокировки |
| 22 | `closed_tag` | string | ❌ | tags (closed_*) | POST | Тег закрытия (closed_af, closed_se, closed_duplicate) |
| 23 | `login_cnt` | int | ❌ | `users_view.sign_in_count` | POST | Количество входов |
| 24 | `last_login_dt` | timestamp | ❌ | `users_view.last_sign_in_at` | POST | Дата последнего входа |
| 25 | `last_visit` | timestamp | `_last_visit` | ❌ | CIO | Последний визит на сайт |
| 26 | `last_cashflow_dt` | timestamp | ❌ | `accounts_view.updated_at` | POST | Последнее движение средств |
| 27 | `duplicates` | string | `duplicates` | ❌ | CIO | Флаг дубликата аккаунта |
| 28 | `duplicates_ip` | bool | ❌ | `user_sessions_view` (IP match) | POST | Дубликат по IP адресу |
| 29 | `psp_trust_lvl` | string | ❌ | `users_view.psp_trusted_level` | POST | Уровень PSP доверия |

### CIO `disabled` Values
| Value | Description |
|:------|:------------|
| `none` | Активен |
| `disabled` | Заблокирован (AF, duplicate) |
| `cooling_off` | Охлаждение (временный) |
| `self_excluded` | Самоисключение (SE) |

### PSP Trusted Level Values

> **Full spec:** [05_SOURCE_POSTQ.md → PSP Trusted Level](05_SOURCE_POSTQ.md#psp-trusted-level-values)

| Value | Scoring Use |
|:------|:------------|
| `trusted_lvl_1` to `trusted_lvl_4` | M-Score (NEWBEE): PSP confidence modifier (×0.90 to ×1.10) |
| `trusted_verified` | Indicates KYC passed on platform |
| `untrusted*` | No deposit history |

**Note:** S-Score НЕ использует PSP — использует KYC tags: `verified`, `pre_verified`

---

## 4. Маркетинговые предпочтения (Marketing)

| # | Field | Type | CIO Source | POST Source | Priority | Description |
|:-:|:------|:-----|:-----------|:------------|:--------:|:------------|
| 29 | `accept_bonus` | bool | `accept_bonuses` | ❌ | CIO | Принимает бонусы |
| 30 | `promo_email` | bool | `receive_promos` | `profiles_view.receive_promos` | CIO | Email промо OK |
| 31 | `promo_sms` | bool | `receive_sms_promos` | `profiles_view.receive_sms_promos` | CIO | SMS промо OK |
| 32 | `unsubscribed` | bool | `unsubscribed` | ❌ | CIO | Отписан от email |
| 33 | `verified_phone` | bool | ❌ | `phones_view.verified_at` IS NOT NULL | POST | Телефон верифицирован |

---

## 5. Депозиты (Deposits)

### Lifetime

| # | Field | Type | CIO Source | POST Source | Priority | SQL |
|:-:|:------|:-----|:-----------|:------------|:--------:|:----|
| 34 | `dep_sum` | float | `lifetime_deposit_sum_total` | `payments_view` | CIO | `SUM(amount_cents)/100 WHERE action='deposit' AND success=true` |
| 35 | `dep_cnt` | int | `lifetime_deposit_count_total` | `payments_view` | CIO | `COUNT(*) WHERE action='deposit' AND success=true` |
| 36 | `dep_cnt_failed` | int | ❌ | `payments_view` | POST | `COUNT(*) WHERE action='deposit' AND success=false` |
| 37 | `ftd_sum` | float | ❌ | `payments_view` | POST | First deposit amount (ROW_NUMBER=1) |
| 38 | `ftd_dt` | timestamp | tag `ftd_YY.MM` | `payments_view` | POST | First deposit date (CIO tag = month only) |
| 39 | `last_dep_dt` | timestamp | `last_time_deposit` | `payments_view` | CIO | `MAX(created_at) WHERE action='deposit'` |
| 40 | `last_dep_sum` | float | `last_sum_deposit` | `payments_view` | CIO | Сумма последнего депозита (`ORDER BY created_at DESC LIMIT 1`) |

### By Period

| # | Period | Count Field | Sum Field | CIO | POST | SQL Filter |
|:-:|:-------|:------------|:----------|:---:|:----:|:-----------|
| 41-42 | 3 days | `dep_cnt_3d` | `dep_sum_3d` | ❌ | ✅ | `created_at >= NOW() - INTERVAL '3 days'` |
| 43-44 | 7 days | `dep_cnt_7d` | `dep_sum_7d` | ✅ | ✅ | `created_at >= NOW() - INTERVAL '7 days'` |
| 45-46 | 14 days | `dep_cnt_14d` | `dep_sum_14d` | ❌ | ✅ | `created_at >= NOW() - INTERVAL '14 days'` |
| 47-48 | 30 days | `dep_cnt_30d` | `dep_sum_30d` | ✅ | ✅ | `created_at >= NOW() - INTERVAL '30 days'` |
| 49-50 | 90 days | `dep_cnt_90d` | `dep_sum_90d` | ✅ | ✅ | `created_at >= NOW() - INTERVAL '90 days'` |
| 51-52 | Previous day | `dep_cnt_1d` | `dep_sum_1d` | ✅ | ✅ | `deposit_count_previous_day_total` |

**CIO Field Names:**
- `deposit_count_last_7_total`, `deposit_sum_last_7_total`
- `deposit_count_last_30_total`, `deposit_sum_last_30_total`
- `deposit_count_last_90_total`, `deposit_sum_last_90_total`
- `deposit_count_previous_day_total`, `deposit_sum_previous_day_total`

---

## 6. Выводы (Withdrawals)

### Lifetime

| # | Field | Type | CIO Source | POST Source | Priority | SQL |
|:-:|:------|:-----|:-----------|:------------|:--------:|:----|
| 53 | `wd_sum` | float | `lifetime_cashout_sum_total` | `payments_view` | CIO | `SUM(amount_cents)/100 WHERE action='cashout' AND success=true` |
| 54 | `wd_cnt` | int | `lifetime_cashout_count_total` | `payments_view` | CIO | `COUNT(*) WHERE action='cashout' AND success=true` |
| 55 | `wd_pending_sum` | float | `pending_wd` | `payments_view` | CIO | `SUM(amount_cents)/100 WHERE action='cashout' AND success IS NULL AND processing=true` |
| 56 | `last_wd_dt` | timestamp | ❌ | `payments_view` | POST | `MAX(created_at) WHERE action='cashout' AND success=true` |

### By Period

| # | Period | Count Field | Sum Field | CIO | POST | SQL Filter |
|:-:|:-------|:------------|:----------|:---:|:----:|:-----------|
| 57-58 | Previous day | `wd_cnt_1d` | `wd_sum_1d` | ✅ | ✅ | `cashout_count_previous_day_total`, `cashout_sum_previous_day_total` |
| 59-60 | 7 days | `wd_cnt_7d` | `wd_sum_7d` | ✅ | ✅ | `cashout_count_last_7_total`, `cashout_sum_last_7_total` |
| 61-62 | 30 days | `wd_cnt_30d` | `wd_sum_30d` | ✅ | ✅ | `cashout_count_last_30_total`, `cashout_sum_last_30_total` |
| 63-64 | 90 days | `wd_cnt_90d` | `wd_sum_90d` | ✅ | ✅ | `cashout_count_last_90_total`, `cashout_sum_last_90_total` |

**CIO Field Names:**
- `cashout_count_previous_day_total`, `cashout_sum_previous_day_total`
- `cashout_count_last_7_total`, `cashout_sum_last_7_total`
- `cashout_count_last_30_total`, `cashout_sum_last_30_total`
- `cashout_count_last_90_total`, `cashout_sum_last_90_total`

---

## 7. Геймплей (Gameplay) — POST only

| # | Field | Type | POST Source | SQL |
|:-:|:------|:-----|:------------|:----|
| 65 | `balance` | float | `accounts_view.amount_cents / 100` | Current balance (EUR wallet) |
| 66 | `bet_sum` | float | `casino_balance_transactions_view` | `SUM(ABS(amount_cents))/100 WHERE action='bet'` |
| 67 | `win_sum` | float | `casino_balance_transactions_view` | `SUM(amount_cents)/100 WHERE action='win'` |
| 68 | `bet_cnt` | int | `casino_balance_transactions_view` | `COUNT(*) WHERE action='bet'` |
| 69 | `last_bet_dt` | timestamp | `casino_balance_transactions_view` | `MAX(created_at) WHERE action='bet'` |

---

## 8. Бонусы (Bonuses) — POST only

| # | Field | Type | POST Source | Status Filter | Description |
|:-:|:------|:-----|:------------|:--------------|:------------|
| 70 | `bonus_wager_done` | float | `bonus_issues_view` | `status='wager_done'` | Отыгранные (включать в cost) |
| 71 | `bonus_lost` | float | `bonus_issues_view` | `status='lost'` | Проигранные (включать в cost) |
| 72 | `bonus_active` | float | `bonus_issues_view` | `status='handle_bets'` | Активные (включать в cost) |
| 73 | `bonus_expired` | float | `bonus_issues_view` | `status='expired'` | Истёкшие (НЕ включать) |
| 74 | `bonus_canceled` | float | `bonus_issues_view` | `status='canceled'` | Отменённые (НЕ включать) |
| 75 | `bonus_pending` | float | `bonus_issues_view` | `status='issued'` | Выданные, ещё не играл (НЕ включать) |
| 76 | `bonus_cnt` | int | `bonus_issues_view` | — | Всего бонусов |
| 77 | `last_bonus_dt` | timestamp | `bonus_issues_view` | — | `MAX(created_at)` |

### Bonus Status Logic

| Status | Игрок использовал? | Включать в `bonus_used`? | Включать в cost? |
|:-------|:------------------:|:------------------------:|:----------------:|
| `wager_done` | ✅ Отыграл | ✅ **ДА** | ✅ Реальные затраты |
| `lost` | ✅ Проиграл | ✅ **ДА** | ✅ Играл на наши деньги |
| `handle_bets` | ✅ Играет сейчас | ✅ **ДА** | ✅ Использует |
| `expired` | ❌ Не использовал | ❌ НЕТ | ❌ Не платим |
| `canceled` | ❌ Отменён | ❌ НЕТ | ❌ Не платим |
| `issued` | ❌ Ещё не начал | ❌ НЕТ | ❌ Ждём |

**Formula:**
```
bonus_used = bonus_wager_done + bonus_lost + bonus_active
```

---

## 9. Коррекции (Corrections) — POST only

| # | Field | Type | POST Source | Action | Description |
|:-:|:------|:-----|:------------|:-------|:------------|
| 77 | `chargeback` | float | `payments_view` | `action='chargeback'` | Chargebacks |
| 78 | `refund` | float | `payments_view` | `action='refund'` | Refunds |
| 79 | `correction` | float | `casino_balance_transactions_view` | `addition - subtraction` | Баланс коррекций (включает addition + subtraction) |
| 80 | `gift` | float | `casino_balance_transactions_view` | `action='gift'` | Подарки (отдельно от NGR!) |

**Formulas:**
```
correction = addition - subtraction    # Pre-calculated in DB_VIP.xlsx
corrections = chargeback + refund + correction
```

> **Note:** `gift` НЕ включается в corrections — отслеживается отдельно.

---

## 10. Attribution & Tracking

### STAG (Affiliate ID)

| # | Field | Type | CIO Source | POST Source | Priority | Description |
|:-:|:------|:-----|:-----------|:------------|:--------:|:------------|
| 83 | `stag` | string | `stag` | `payments_view.attributes` | CIO | Affiliate ID (registration) |

| Location | Storage | History | Fill Rate | Use Case |
|:---------|:--------|:--------|:---------:|:---------|
| CIO `stag` (profile) | Registration value | **Never changes** | ~60% | Original affiliate |
| CIO `activity.data.stag` | Per-visit | ~90 days | — | Re-attribution |
| POST `payments_view.attributes` | Per-deposit | Lifetime | 10.5% | Deposit-level tracking |

**Format:** `{affiliate_id}_{click_id}` (e.g., `246054_6689861cded0f6869ae6ec7e`)

**SQL Extraction:**
```sql
SUBSTRING(attributes->>'affiliateTag' FROM 'stag=([^,]+)')
```

### UTM (POST only)

| # | Field | Fill Rate | POST Source | Description |
|:-:|:------|:---------:|:------------|:------------|
| 84 | `utm_source` | 3.3% | `ad_tags_view.utm_source` | Traffic source |
| 85 | `utm_medium` | 3.3% | `ad_tags_view.utm_medium` | Medium |
| 86 | `utm_campaign` | 3.3% | `ad_tags_view.utm_campaign` | Campaign |
| 87 | `utm_content` | 3.0% | `ad_tags_view.utm_content` | Content |
| 88 | `utm_term` | ~0% | `ad_tags_view.utm_term` | Term (empty) |
| 89 | `ref_code` | 0.04% | `ad_tags_view.ref_code` | Referral code (NOT stag!) |

### Tags & Groups

| # | Field | Type | CIO Source | POST Source | Format |
|:-:|:------|:-----|:-----------|:------------|:-------|
| 90 | `tags` | JSON | `tags` | `users_view.tags` | CIO=JSON array, POST=CSV |
| 91 | `groups` | JSON | `groups` | `users_groups_view` | CIO=JSON array, POST=relational |

---

## 11. Device / Session

| # | Field | Type | CIO Source | POST Source | Priority | Description |
|:-:|:------|:-----|:-----------|:------------|:--------:|:------------|
| 92 | `device_type` | string | ❌ | `user_sessions_view.device_type` | POST | mobile / desktop / tablet |
| 93 | `device` | string | ❌ | `user_sessions_view.user_agent` | POST | Parsed: iPhone, Android, PC, Mac, etc. |
| 94 | `browser` | string | ❌ | `user_sessions_view.user_agent` | POST | Parsed: Chrome, Safari, Firefox, etc. |
| 95 | `os` | string | ❌ | `user_sessions_view.user_agent` | POST | Parsed: iOS, Android, Windows, macOS, etc. |
| 96 | `user_agent` | string | ❌ | `user_sessions_view.user_agent` | POST | Raw user agent string |
| 97 | `last_login_country` | string | `last_login_country` | `user_sessions_view` (GeoIP) | CIO | Страна последнего входа (GeoIP) |
| 98 | `screen_width` | int | `page.width` (activity) | ❌ | CIO | Ширина экрана (px) |
| 99 | `screen_height` | int | `page.height` (activity) | ❌ | CIO | Высота экрана (px) |
| 100 | `device_brand` | string | — | `user_agent` (parsed) | Calc | Apple, Samsung, Xiaomi, Google, etc. |
| 101 | `device_model` | string | — | `user_agent` (parsed) | Calc | SM-S918B, Pixel 7 Pro, etc. |
| 102 | `device_model_name` | string | — | `user_agent` + screen | Calc | Galaxy S23 Ultra, iPhone 15 Pro, etc. |
| 103 | `os_version` | string | — | `user_agent` (parsed) | Calc | 17.0, 14, 10/11, etc. |
| 104 | `device_class` | string | — | `user_agent` (parsed) | Calc | flagship, mid-range, budget, desktop, tablet |

### device_type Values

| Value | Description |
|:------|:------------|
| `mobile` | Мобильный телефон |
| `desktop` | Компьютер |
| `tablet` | Планшет |

### device Values (Parsed)

| Value | Condition |
|:------|:----------|
| `iPhone` | user_agent ILIKE '%iPhone%' |
| `iPad` | user_agent ILIKE '%iPad%' |
| `Android` | user_agent ILIKE '%Android%' AND device_type = 'mobile' |
| `Tablet` | user_agent ILIKE '%Android%' AND device_type = 'tablet' |
| `Mac` | user_agent ILIKE '%Macintosh%' |
| `PC` | user_agent ILIKE '%Windows%' |
| `Linux PC` | user_agent ILIKE '%Linux%' |
| `Unknown` | Fallback |

### browser Values (Parsed)

| Value | Condition |
|:------|:----------|
| `Chrome` | user_agent ILIKE '%Chrome%' AND user_agent NOT ILIKE '%Edg%' |
| `Safari` | user_agent ILIKE '%Safari%' AND user_agent NOT ILIKE '%Chrome%' |
| `Firefox` | user_agent ILIKE '%Firefox%' |
| `Edge` | user_agent ILIKE '%Edg%' |
| `Opera` | user_agent ILIKE '%OPR%' OR user_agent ILIKE '%Opera%' |
| `Samsung` | user_agent ILIKE '%SamsungBrowser%' |
| `Unknown` | Fallback |

### os Values (Parsed)

| Value | Condition |
|:------|:----------|
| `iOS` | user_agent ILIKE '%iPhone%' OR user_agent ILIKE '%iPad%' |
| `Android` | user_agent ILIKE '%Android%' |
| `Windows` | user_agent ILIKE '%Windows%' |
| `macOS` | user_agent ILIKE '%Macintosh%' |
| `Linux` | user_agent ILIKE '%Linux%' AND user_agent NOT ILIKE '%Android%' |
| `Unknown` | Fallback |

### Device Parsing Logic (SQL)

```sql
-- device
CASE
    WHEN user_agent ILIKE '%iPhone%' THEN 'iPhone'
    WHEN user_agent ILIKE '%iPad%' THEN 'iPad'
    WHEN user_agent ILIKE '%Macintosh%' THEN 'Mac'
    WHEN user_agent ILIKE '%Android%' AND device_type = 'mobile' THEN 'Android'
    WHEN user_agent ILIKE '%Android%' AND device_type = 'tablet' THEN 'Tablet'
    WHEN user_agent ILIKE '%Windows%' THEN 'PC'
    WHEN user_agent ILIKE '%Linux%' THEN 'Linux PC'
    ELSE 'Unknown'
END as device,

-- browser
CASE
    WHEN user_agent ILIKE '%SamsungBrowser%' THEN 'Samsung'
    WHEN user_agent ILIKE '%OPR%' OR user_agent ILIKE '%Opera%' THEN 'Opera'
    WHEN user_agent ILIKE '%Edg%' THEN 'Edge'
    WHEN user_agent ILIKE '%Firefox%' THEN 'Firefox'
    WHEN user_agent ILIKE '%Chrome%' THEN 'Chrome'
    WHEN user_agent ILIKE '%Safari%' THEN 'Safari'
    ELSE 'Unknown'
END as browser,

-- os
CASE
    WHEN user_agent ILIKE '%iPhone%' OR user_agent ILIKE '%iPad%' THEN 'iOS'
    WHEN user_agent ILIKE '%Android%' THEN 'Android'
    WHEN user_agent ILIKE '%Windows%' THEN 'Windows'
    WHEN user_agent ILIKE '%Macintosh%' THEN 'macOS'
    WHEN user_agent ILIKE '%Linux%' THEN 'Linux'
    ELSE 'Unknown'
END as os
```

### Device Distribution (from DB)

| Device | Sessions |
|:-------|:---------|
| Android | 265,246 |
| iPhone | 218,091 |
| PC | 32,217 |
| Linux PC | 14,570 |
| Mac | 10,791 |
| Tablet | 2,958 |
| iPad | 954 |

> **Note:** Данные из последней сессии пользователя (`ORDER BY created_at DESC LIMIT 1`)

### Screen Resolution

| Field | Type | Source | Description |
|:------|:-----|:-------|:------------|
| `screen_width` | int | CIO Activities | Ширина экрана (px) |
| `screen_height` | int | CIO Activities | Высота экрана (px) |

**Data Source:** Customer.io `page` activity → `data.width`, `data.height`

```bash
# Get last page activity with screen resolution
curl -s "https://api-eu.customer.io/v1/api/customers/kaasino:{user_id}/activities?type=page&limit=1" \
  -H "Authorization: Bearer {APP_API_KEY}"
```

**Response example:**
```json
{
  "data": {
    "url": "https://kaasino.com/en/games/",
    "width": "1280",
    "height": "681"
  }
}
```

> **Note:** Значения приходят как string, конвертируются в int при импорте. Если нет `page` activity — значение `null`.

### Device Model Detection

Определение модели устройства на основе `user_agent` + `screen_width/height`:

```python
from sources.customerio import parse_device_model

info = parse_device_model(user_agent, screen_width, screen_height)
# Returns: {brand, model, model_name, os_version, device_class}
```

**device_brand Values:**

| Value | Description | Examples |
|:------|:------------|:---------|
| `Apple` | Apple devices | iPhone, iPad, Mac |
| `Samsung` | Samsung devices | SM-S918B, SM-A546B |
| `Xiaomi` | Xiaomi/Redmi/POCO | M2102J20SG, Redmi Note 12 |
| `Google` | Google Pixel | Pixel 7 Pro, Pixel 8 |
| `OnePlus` | OnePlus devices | OnePlus 11 |
| `OPPO` | OPPO devices | CPH2359 |
| `Realme` | Realme devices | RMX3630 |
| `Huawei` | Huawei devices | HUAWEI P50 |
| `Windows` | Windows PC | — |
| `Linux` | Linux PC | — |
| `Android` | Generic Android | Model "K" (privacy mode) |

**device_class Values:**

| Value | Description | Examples |
|:------|:------------|:---------|
| `flagship` | High-end devices | Galaxy S24 Ultra, iPhone 15 Pro, Pixel Pro |
| `mid-range` | Mid-tier devices | Galaxy A54, iPhone 14, Redmi Note |
| `budget` | Entry-level devices | Galaxy A14, iPhone SE, Realme |
| `desktop` | Desktop/Laptop | Windows, macOS, Linux |
| `tablet` | Tablet devices | iPad |
| `unknown` | Cannot determine | Android privacy mode |

**Samsung Model Codes:**

| Code | Model Name |
|:-----|:-----------|
| SM-S928 | Galaxy S24 Ultra |
| SM-S918 | Galaxy S23 Ultra |
| SM-S908 | Galaxy S22 Ultra |
| SM-A556 | Galaxy A55 |
| SM-A546 | Galaxy A54 |
| SM-F946 | Galaxy Z Fold5 |
| SM-F731 | Galaxy Z Flip5 |

**iPhone Model by Screen Resolution:**

| Resolution | Model |
|:-----------|:------|
| 430×932 | iPhone 15 Pro Max |
| 428×926 | iPhone 14 Pro Max |
| 393×852 | iPhone 15 Pro |
| 390×844 | iPhone 14 |
| 375×812 | iPhone X |
| 375×667 | iPhone SE |

> **Note:** Screen resolution — это viewport size (размер окна браузера), может отличаться от физического разрешения.

---

## 12. Расчётные метрики (Calculated Metrics)

> **Source:** Все расчёты выполняются на основе POST данных.

### 12.1 Финансовые метрики

| # | Field | Formula | Description |
|:-:|:------|:--------|:------------|
| 95 | **`in_out`** | `dep_sum - wd_sum` | Net Cash Flow (dep - wd) |
| 96 | **`ggr`** | `bet_sum - win_sum` | Gross Gaming Revenue |
| 97 | **`bonus_used`** | `bonus_wager_done + bonus_lost + bonus_active` | Реально использованные бонусы |
| 98 | **`correction`** | `addition - subtraction` | Баланс коррекций |
| 99 | **`ngr`** | `ggr - bonus_total` | Net Gaming Revenue (упрощённый) |
| 100 | **`real_ngr`** | `ggr - bonus_used - correction - (chargeback + refund)` | **Real Net Gaming Revenue** |
| 101 | **`spend`** | `in_out - balance - wd_pending_sum` | Реально потрачено игроком |

### 12.2 Средние значения

| # | Field | Formula | Description |
|:-:|:------|:--------|:------------|
| 102 | `avg_dep` | `dep_sum / dep_cnt` | Средний депозит |
| 103 | `avg_bet` | `bet_sum / bet_cnt` | Средняя ставка |
| 104 | `avg_bonus` | `bonus_used / bonus_cnt` | Средний бонус |

### 12.3 Коэффициенты (Ratios)

| # | Field | Formula | Description | Risk Thresholds |
|:-:|:------|:--------|:------------|:----------------|
| 105 | **`bonus_dep_rate`** | `(bonus_used / dep_sum) × 100` | % бонусов от депозитов | 🟢 <15%, 🟡 15-25%, 🟠 25-50%, 🟠 50-70%, 🔴 >70% |
| 106 | **`bonus_ggr_rate`** | `(bonus_used / ggr) × 100` | % бонусов от GGR | 🟢 <20%, 🟡 20-30%, 🟠 30-60%, 🟠 60-75%, 🔴 >75% |
| 107 | **`rtp`** | `(win_sum / bet_sum) × 100` | Return to Player % (standalone, NOT in S-Score) | 🟢 <95.5% (5), 🟢 95.5-97% (4), 🟡 97-98.5% (3), 🟠 98.5-100% (2), 🔴 >100% (1) |
| 108 | **`bet_dep_rate`** | `bet_sum / dep_sum` | Оборот средств | — |
| 109 | **`wd_dep_rate`** | `(wd_sum / dep_sum) × 100` | % выводов от депозитов | 🟢 <30%, 🟡 <45%, 🟠 <60%, 🟠 <75%, 🔴 ≥100% |
| 110 | **`ngr_dep_rate`** | `(real_ngr / dep_sum) × 100` | Real NGR % от депозитов | — |
| 111 | **`dep_success_rate`** | `dep_cnt / (dep_cnt + dep_cnt_failed) × 100` | % успешных депозитов | — |
| 112 | **`velocity`** | `(dep_sum_7d × 4) / dep_sum_30d` | Velocity (V-Score input) | 🚀 ≥1.5 (5), ✅ 1.0-1.49 (4), ⚠️ 0.5-0.99 (3), 🚨 0.01-0.49 (2), 💀 0 (1) |

### 12.4 Поведенческие метрики

| # | Field | Formula | Description | Special Values |
|:-:|:------|:--------|:------------|:---------------|
| 113 | `age` | `EXTRACT(YEAR FROM AGE(dob))` | Возраст игрока | — |
| 114 | `reg_recency` | `NOW() - reg_dt` | Дней с регистрации | — |
| 115 | `ftd_recency` | `NOW() - ftd_dt` | Дней с первого депозита | — |
| 116 | `dep_recency` | `NOW() - last_dep_dt` | Дней с последнего депозита (R-Score input) | — |
| 117 | `login_recency` | `NOW() - last_login_dt` | Дней с последнего входа | — |
| 118 | `cashflow_recency` | `NOW() - last_cashflow_dt` | Дней с последнего движения средств | — |
| 119 | `bet_recency` | `NOW() - last_bet_dt` | Дней с последней ставки | `999` = never |
| 120 | `wd_recency` | `NOW() - last_wd_dt` | Дней с последнего вывода | `999` = never |
| 121 | `bonus_recency` | `NOW() - last_bonus_dt` | Дней с последнего бонуса | `999` = never |
| 122 | `dep_per_session` | `dep_cnt / login_cnt` | Депозитов на сессию | — |
| 123 | `bet_per_session` | `bet_cnt / login_cnt` | Ставок на сессию | — |

### 12.5 Статус и уровень игрока

| # | Field | Type | Source | Values | Description |
|:-:|:------|:-----|:-------|:-------|:------------|
| 124 | `status` | string | calculated | `active`, `closed` | Статус аккаунта |
| 125 | `kyc` | string | tags | `verified`, `pre_verified`, `psp_trusted_verified`, `unverified` | KYC статус верификации |
| 126 | `grade` | string | tags + vip_level | `GOLD ⭐️`, `SILVER ⭐️`, `BRONZE ⭐️`, `COPPER ⭐️`, `vip`, `pre-vip`, `` | ⚠️ **INTERNAL** — уровень игрока |
| 127 | `add_badge` | string | manual | `ABSOLUTE ⭐️`, `` | Дополнительный бейдж (ручное назначение) |

> **⚠️ `grade` — INTERNAL METRIC:**
> - **Не видно игроку** — используется только для внутренней аналитики и CRM
> - **Не связано с программой лояльности** — НЕ пересекается с Cheese Club / loyalty levels
> - **Назначение:** приоритизация VIP-команды, правила бонусов, сегментация

**KYC Logic (from tags):**
```python
# Priority order: verified > pre_verified > psp_trusted_verified > unverified
for status in ['verified', 'pre_verified', 'psp_trusted_verified']:
    if status in tags_lower:
        kyc = status
        break
else:
    kyc = 'unverified'
```

**Grade Hierarchy (⚠️ INTERNAL — not visible to player, ≠ loyalty program):**
```
GOLD ⭐️ > SILVER ⭐️ > BRONZE ⭐️ > COPPER ⭐️ > vip > pre-vip > (empty)
```

| Grade | Source | Condition |
|:------|:-------|:----------|
| `GOLD ⭐️` | vip_level | Metal tier = GOLD |
| `SILVER ⭐️` | vip_level | Metal tier = SILVER |
| `BRONZE ⭐️` | vip_level | Metal tier = BRONZE |
| `COPPER ⭐️` | vip_level | Metal tier = COPPER |
| `vip` | vip_status | Has VIP tag, no metal |
| `pre-vip` | vip_status | Has pre-vip tag |
| `` | — | No VIP status |

### 12.6 Бонусные метрики

| # | Field | Formula | Description |
|:-:|:------|:--------|:------------|
| 126 | `bonus_total` | `bonus_wager_done + bonus_lost + bonus_active + bonus_expired + bonus_canceled + bonus_pending` | Все бонусы |
| 127 | `bonus_wager_rate` | `(bonus_wager_done / bonus_used) × 100` | % отыгранных от использованных |
| 128 | `bonus_used_rate` | `(bonus_used / bonus_total) × 100` | % использованных от всего |

### 12.7 Дополнительные поля

| # | Field | Type | Source | Description |
|:-:|:------|:-----|:-------|:------------|
| 129 | `wd_pending_cnt` | int | POST | Количество pending выводов |
| 130 | `currency_2` | string | POST | Вторая валюта |
| 131 | `currency_3` | string | POST | Третья валюта |
| 132 | `currency_4` | string | POST | Четвёртая валюта |
| 133 | `currency_5` | string | POST | Пятая валюта |

---

## 13. Data Source Priority

| Data Type | Primary | Fallback | Notes |
|:----------|:-------:|:--------:|:------|
| Identity (email, phone) | **CIO** | ❌ | Только CIO |
| Profile (name, country) | **POST** | CIO | POST более свежий |
| Deposits/Cashouts (lifetime) | **CIO** | POST (recalc) | CIO агрегаты быстрее |
| Deposits by Period (3d, 14d) | **POST** | ❌ | Нет в CIO |
| Balance | **POST** | ❌ | Только POST |
| Gaming (bet/win/GGR) | **POST** | ❌ | Только POST |
| Bonuses | **POST** | ❌ | Только POST |
| STAG | **CIO** | POST (payments) | CIO = registration stag |
| UTM | **POST** | CIO (activities) | POST более полный |
| Device | **POST** | ❌ | Только POST |
| Tags | **CIO** | POST | CIO = JSON, POST = CSV |
| Groups | **CIO** | POST | CIO = JSON, POST = relational |

---

## 14. Field Naming Convention

| Pattern | Example | Description |
|:--------|:--------|:------------|
| `*_sum` | `dep_sum` | Сумма (**EUR-консолидированная**) |
| `*_cnt` | `dep_cnt` | Количество |
| `*_dt` | `last_dep_dt` | Дата/timestamp |
| `*_Nd` | `dep_cnt_7d` | За последние N дней |
| `*_recency` | `dep_recency` | Дней с последнего события |
| `wd_*` | `wd_sum` | Withdrawal (вывод) |
| `dep_*` | `dep_sum` | Deposit |
| `bonus_*` | `bonus_used` | Bonus related |
| `*_rate` | `bonus_dep_rate` | Ratio/percentage |

> **⚠️ EUR Consolidation (CIO Pattern):**
> Все финансовые поля (`*_sum`, `balance`, `ggr`, `ngr`, etc.) — **уже EUR-консолидированные**.
> По аналогии с Customer.io `_total` суффиксом: мультивалютные транзакции конвертируются в EUR на момент транзакции и агрегируются.
> Отдельные `*_eur` колонки **НЕ нужны** — основные поля уже содержат EUR-консолидированные значения.

---

## 15. PostgreSQL Views Reference

| View | Rows | Key Fields |
|:-----|-----:|:-----------|
| `users_view` | ~50K | id, sign_in_count, psp_trusted_level, locked_at |
| `accounts_view` | ~50K | id (wallet), user_id, amount_cents, currency |
| `payments_view` | ~350K | user_id, action, amount_cents, success |
| `casino_balance_transactions_view` | ~63M | account_id, action, amount_cents |
| `bonus_issues_view` | ~77K | account_id, amount_cents, status |
| `profiles_view` | ~50K | user_id, first_name, last_name, country |
| `profiles_view_2` | ~50K | user_id, date_of_birth, gender |
| `user_sessions_view` | ~550K | user_id, device_type, user_agent |
| `ad_tags_view` | ~92K | user_id, utm_*, ref_code, ga_id |
| `users_groups_view` | — | user_id, group_id |

---

## 15. XLSX Field Mapping (DB_VIP.xlsx)

> **Reference:** Маппинг колонок XLSX файла (138 колонок) на каноничные имена полей.
> **File:** `01_ENGINE/DB_VIP.xlsx` | **Rows:** 2,138 | **Updated:** 2025-12-29

### 15.1 Identification & Profile (1-14)

| # | XLSX Column | Type | Notes |
|:-:|:------------|:-----|:------|
| 1 | `brand` | string | ✅ |
| 2 | `user_id` | bigint | ✅ PK |
| 3 | `cio_id` | string | ✅ |
| 4 | `intercom_id` | string | ✅ |
| 5 | `email` | string | ✅ |
| 6 | `phone` | string | ✅ |
| 7 | `first_name` | string | ✅ |
| 8 | `last_name` | string | ✅ |
| 9 | `country` | string | ✅ |
| 10 | `city` | string | ✅ |
| 11 | `gender` | string | ✅ |
| 12 | `dob` | date | ✅ |
| 13 | `locale` | string | ✅ |
| 14 | `timezone` | string | ✅ |

### 15.2 Account Status (15-24)

| # | XLSX Column | Type | Notes |
|:-:|:------------|:-----|:------|
| 15 | `psp_trust_lvl` | string | ✅ |
| 16 | `status` | string | ✅ active/closed |
| 17 | `closed_reason` | string | ✅ |
| 18 | `closed_tag` | string | ✅ NEW |
| 19 | `duplicates` | string | ✅ |
| 20 | `duplicates_ip` | bool | ✅ |
| 21 | `reg_dt` | timestamp | ✅ |
| 22 | `verified_email` | timestamp | ✅ |
| 23 | `verified_phone` | bool | ✅ |
| 24 | `kyc` | string | ✅ |

### 15.3 FTD & Activity (25-33)

| # | XLSX Column | Type | Notes |
|:-:|:------------|:-----|:------|
| 25 | `ftd_sum` | float | ✅ |
| 26 | `ftd_dt` | timestamp | ✅ |
| 27 | `last_dep_dt` | timestamp | ✅ |
| 28 | `last_visit` | timestamp | ✅ |
| 29 | `last_cashflow_dt` | timestamp | ✅ |
| 30 | `login_cnt` | int | ✅ |
| 31 | `dep_per_session` | float | ✅ |
| 32 | `bet_per_session` | float | ✅ |
| 33 | `bet_dep_rate` | float | ✅ |

### 15.4 Currency & Finance (34-51)

| # | XLSX Column | Type | Notes |
|:-:|:------------|:-----|:------|
| 34 | `currency` | string | ✅ Primary |
| 35-38 | `currency_2..5` | string | ✅ Additional |
| 39 | `dep_sum` | float | ✅ |
| 40 | `balance` | float | ✅ |
| 41 | `correction` | float | ✅ |
| 42 | `chargeback` | float | ✅ |
| 43 | `spend` | float | ✅ |
| 44 | `in_out` | float | ✅ |
| 45 | `ggr` | float | ✅ |
| 46 | `ngr` | float | ✅ |
| 47 | `real_ngr` | float | ✅ |
| 48 | `bet_sum` | float | ✅ |
| 49 | `win_sum` | float | ✅ |
| 50 | `bet_cnt` | int | ✅ |
| 51 | `rtp` | float | ✅ |

### 15.5 Bonuses (52-53)

| # | XLSX Column | Type | Notes |
|:-:|:------------|:-----|:------|
| 52 | `bonus_used` | float | ✅ |
| 53 | `bonus_ggr_rate` | float | ✅ |

### 15.6 Deposits by Period (54-68)

| # | XLSX Column | Type | Notes |
|:-:|:------------|:-----|:------|
| 54 | `last_dep_sum` | float | ✅ |
| 55 | `avg_dep` | float | ✅ |
| 56-61 | `dep_sum_1d..90d` | float | ✅ 1d, 3d, 7d, 14d, 30d, 90d |
| 62 | `dep_cnt` | int | ✅ Lifetime |
| 63-68 | `dep_cnt_1d..90d` | int | ✅ 1d, 3d, 7d, 14d, 30d, 90d |

### 15.7 Withdrawals by Period (69-80)

| # | XLSX Column | Type | Notes |
|:-:|:------------|:-----|:------|
| 69 | `wd_sum` | float | ✅ Lifetime |
| 70 | `wd_pending_sum` | float | ✅ |
| 71 | `wd_pending_cnt` | int | ✅ |
| 72-75 | `wd_sum_1d..90d` | float | ✅ 1d, 7d, 30d, 90d |
| 76 | `wd_cnt` | int | ✅ Lifetime |
| 77-80 | `wd_cnt_1d..90d` | int | ✅ 1d, 7d, 30d, 90d |

### 15.8 Marketing & Attribution (81-91)

| # | XLSX Column | Type | Notes |
|:-:|:------------|:-----|:------|
| 81 | `accept_bonus` | bool | ✅ |
| 82 | `promo_email` | bool | ✅ |
| 83 | `promo_sms` | bool | ✅ |
| 84 | `unsubscribed` | bool | ✅ |
| 85 | `ref_code` | string | ✅ |
| 86 | `stag` | string | ✅ |
| 87 | `tags` | JSON | ✅ |
| 88 | `grade` | string | ✅ VIP grade |
| 89 | `add_badge` | string | ✅ ABSOLUTE |
| 90 | `groups` | JSON | ✅ |
| 91 | `last_login_country` | string | ✅ |

### 15.9 Recency Fields (92-102)

| # | XLSX Column | Type | Notes |
|:-:|:------------|:-----|:------|
| 92 | `last_bet_dt` | timestamp | ✅ |
| 93 | `last_wd_dt` | timestamp | ✅ |
| 94 | `last_bonus_dt` | timestamp | ✅ |
| 95 | `reg_recency` | int | ✅ Days |
| 96 | `ftd_recency` | int | ✅ Days |
| 97 | `dep_recency` | int | ✅ Days |
| 98 | `login_recency` | int | ✅ Days |
| 99 | `cashflow_recency` | int | ✅ Days |
| 100 | `bet_recency` | int | ✅ Days |
| 101 | `wd_recency` | int | ✅ Days |
| 102 | `bonus_recency` | int | ✅ Days |

### 15.10 Device & Session (103-113)

| # | XLSX Column | Type | Notes |
|:-:|:------------|:-----|:------|
| 103 | `device_type` | string | ✅ mobile/desktop/tablet |
| 104 | `device` | string | ✅ iPhone/Android/PC |
| 105 | `device_brand` | string | ✅ Apple/Samsung/etc |
| 106 | `device_model` | string | ✅ SM-S918B/etc |
| 107 | `device_model_name` | string | ✅ Galaxy S23 Ultra |
| 108 | `device_class` | string | ✅ flagship/mid-range/budget |
| 109 | `os` | string | ✅ iOS/Android/Windows |
| 110 | `browser` | string | ✅ Chrome/Safari/etc |
| 111 | `screen_width` | int | ✅ Pixels |
| 112 | `screen_height` | int | ✅ Pixels |
| 113 | `user_agent` | string | ✅ Raw UA |

### 15.11 Calculated Metrics (114-129)

| # | XLSX Column | Type | Notes |
|:-:|:------------|:-----|:------|
| 114 | `bonus_cnt` | int | ✅ |
| 115 | `age` | int | ✅ Years |
| 116 | `avg_bet` | float | ✅ |
| 117 | `avg_bonus` | float | ✅ |
| 118 | `dep_success_rate` | float | ✅ % |
| 119 | `ngr_dep_rate` | float | ✅ % |
| 120 | `wd_dep_rate` | float | ✅ % |
| 121 | `dep_cnt_failed` | int | ✅ |
| 122 | `bonus_dep_rate` | float | ✅ % |
| 123 | `bonus_total` | float | ✅ |
| 124 | `bonus_wager_rate` | float | ✅ % |
| 125 | `bonus_used_rate` | float | ✅ % |
| 126 | `utm_source` | string | ✅ |
| 127 | `utm_medium` | string | ✅ |
| 128 | `utm_campaign` | string | ✅ |
| 129 | `utm_content` | string | ✅ |

### 15.12 Summary

| Category | Count |
|:---------|------:|
| Exact match (canonical names) | 129 |
| New fields (vs previous 75) | +54 |
| Device fields | 11 |
| Recency fields | 11 |
| **Total XLSX columns** | **129** |

> **Note:** `*_eur` колонки убраны — все финансовые поля уже EUR-консолидированные (см. Section 14).

---

## 16. Summary

### Field Count

| Category | Count | Fields |
|:---------|------:|:-------|
| 1. Identification | 7 | #1-7 |
| 2. Profile | 10 | #8-17 |
| 3. Account Status | 12 | #18-29 (incl. closed_tag) |
| 4. Marketing | 5 | #30-34 |
| 5. Deposits | 19 | #35-53 |
| 6. Withdrawals | 12 | #54-65 |
| 7. Gameplay | 5 | #66-70 |
| 8. Bonuses | 8 | #71-78 |
| 9. Corrections | 4 | #79-82 |
| 10. Attribution & Tracking | 9 | #83-91 |
| 11. Device / Session | 13 | #92-104 (incl. device_brand/model/class) |
| **Subtotal (Raw)** | **104** | |
| 12. Calculated Metrics | 29 | #105-133 |
| **Total** | **133** | |

> **Note:** Все финансовые поля — EUR-консолидированные. Отдельные `*_eur` колонки не нужны.

### Source Distribution

| Source | Primary | Fallback | POST-only |
|:-------|--------:|---------:|----------:|
| CIO (Customer.io) | 31 | 10 | — |
| POST (PostgreSQL) | 65 | 8 | 50 |
| INT (Intercom) | 1 | — | — |

### Source Priority Summary

| Priority | Count | Description |
|:---------|------:|:------------|
| CIO | 37 | CIO primary, POST fallback |
| POST | 66 | POST primary or POST-only |
| Hybrid | 12 | Both sources, merged logic |
| Calculated | 38 | Derived from other fields |

### XLSX vs Glossary Sync

| Metric | Value |
|:-------|------:|
| XLSX columns (DB_VIP.xlsx) | 129 |
| Glossary fields (03_SOURCE.md) | 133 |
| Coverage | 97% |

> **EUR Consolidation:** Все `*_sum`, `balance`, `ggr`, `ngr` поля уже консолидированы в EUR (как CIO `_total` pattern).

---
