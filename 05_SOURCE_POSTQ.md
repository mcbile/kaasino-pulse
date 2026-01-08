---
font: monospace
header-color: indigo
---

# REPLICA_VIEWS Schema Map

> PostgreSQL: `209.38.179.49:31776/kaasino`
> Schema: `replica_views` (23 views)

## Related Documents

| Document | Purpose | Link |
|----------|---------|------|
| **03_SOURCE.md** | Unified Field Glossary — canonical field names, POST→Internal mapping | [→ 03_SOURCE.md](03_SOURCE.md) |
| **04_SOURCE_CIO.md** | Customer.io API — CIO-specific attributes, segments, tags | [→ 04_SOURCE_CIO.md](04_SOURCE_CIO.md) |

---

## Quick Reference

| View | Rows | Key Fields |
|------|------|------------|
| users_view | ~50K | id, sign_in_count, psp_trusted_level, locked_at |
| accounts_view | ~50K | id (wallet), user_id, amount_cents, currency |
| payments_view | ~350K | user_id, action, amount_cents, success |
| casino_balance_transactions_view | ~63M | account_id, action, amount_cents |
| bonus_issues_view | ~77K | account_id, amount_cents, status |
| profiles_view | ~50K | user_id, first_name, last_name, country |
| profiles_view_2 | ~50K | user_id, date_of_birth, gender |

---

## 1. users_view

**Primary user table with authentication data**

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint | User ID (primary key) |
| `created_at` | timestamp | Registration date |
| `tags` | varchar | User tags (comma-separated) |
| `updated_at` | timestamp | Last update |
| `confirmed_at` | timestamp | Email confirmation date |
| `customerio` | varchar | Customer.io ID |
| `locked_at` | timestamp | Account lock date (NULL = active) |
| `last_sign_in_at` | timestamp | Last login date |
| `last_sign_in_ip` | varchar | Last login IP |
| `current_sign_in_ip` | varchar | Current session IP |
| `current_sign_in_at` | timestamp | Current session start |
| `current_sign_in_country` | varchar | Current country (2-letter) |
| `sign_in_count` | integer | Total login count |
| `psp_trusted_level` | text | Payment trust level (см. ниже) |

### PSP Trusted Level Values

> Индикатор истории депозитов игрока **на всей платформе** (~1500 брендов).

| Value | Значение | Требование |
|:------|:---------|:-----------|
| `trusted_lvl_1` | Новичок | €100+ OR 2+ депозитов на платформе |
| `trusted_lvl_2` | Базовый | €200+ депозитов |
| `trusted_lvl_3` | Опытный | €300+ депозитов |
| `trusted_lvl_4` | Надёжный | €500+ депозитов |
| `trusted_verified` | Верифицирован | Был cashout (KYC на любом бренде) |
| `untrusted` | Органика | Прямой трафик, нет истории |
| `untrusted_from_affiliates` | Affiliate | Партнёрский трафик, нет истории |

```sql
-- Get user by ID
SELECT id, sign_in_count, psp_trusted_level, locked_at, last_sign_in_at
FROM replica_views.users_view
WHERE id = 12345;

-- Get all sign-in counts
SELECT id, sign_in_count
FROM replica_views.users_view
WHERE id IN (1, 2, 3);

-- Get locked (disabled) users
SELECT id, locked_at
FROM replica_views.users_view
WHERE locked_at IS NOT NULL;

-- Get PSP trust levels
SELECT id, psp_trusted_level
FROM replica_views.users_view
WHERE psp_trusted_level IS NOT NULL;

-- Detect duplicates by IP
SELECT last_sign_in_ip, COUNT(DISTINCT id) as user_count
FROM replica_views.users_view
WHERE last_sign_in_ip IS NOT NULL
GROUP BY last_sign_in_ip
HAVING COUNT(DISTINCT id) > 1;
```

---

## 2. accounts_view

**User wallets (one per currency)**

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint | Wallet ID (account_id) |
| `amount_cents` | bigint | Current balance in cents |
| `created_at` | timestamp | Wallet creation date |
| `currency` | varchar | Currency code (EUR, USD, etc.) |
| `updated_at` | timestamp | Last balance change |
| `user_id` | bigint | Owner user ID |

```sql
-- Get user balance
SELECT
    id as wallet_id,
    user_id,
    amount_cents / 100.0 as balance,
    currency,
    updated_at as account_id_date
FROM replica_views.accounts_view
WHERE user_id = 12345;

-- Get all balances for users
SELECT user_id, SUM(amount_cents) / 100.0 as total_balance
FROM replica_views.accounts_view
WHERE user_id IN (1, 2, 3)
GROUP BY user_id;
```

---

## 3. payments_view

**All payment transactions (deposits, cashouts, chargebacks)**

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint | Payment ID |
| `action` | varchar | `deposit`, `cashout`, `chargeback`, `refund`, `reversal` |
| `admin_user_id` | bigint | Admin who processed (if manual) |
| `amount_cents` | bigint | Amount in cents |
| `created_at` | timestamp | Transaction date |
| `commission_amount_cents` | bigint | Commission charged |
| `currency` | varchar | Currency code |
| `finished_at` | timestamp | Completion date |
| `manual` | boolean | Manual transaction flag |
| `network_fee_cents` | bigint | Network fee (crypto) |
| `payment_system_id` | bigint | Payment system FK |
| `success` | boolean | `true`=success, `false`=failed, `NULL`=pending |
| `updated_at` | timestamp | Last update |
| `user_id` | bigint | User ID |
| `psp_brand` | varchar | Payment brand |
| `psp_system` | varchar | Payment system |
| `processing` | boolean | Currently processing |
| `bonus_code` | text | Bonus code used |
| `recalled` | boolean | Recalled transaction |

```sql
-- Get First Time Deposit (FTD)
WITH first_deposits AS (
    SELECT
        user_id,
        amount_cents / 100.0 as ftd_sum,
        created_at as ftd_date,
        ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) as rn
    FROM replica_views.payments_view
    WHERE action = 'deposit' AND success = true
)
SELECT user_id, ftd_sum, ftd_date
FROM first_deposits
WHERE rn = 1 AND user_id IN (1, 2, 3);

-- Get lifetime deposit stats
SELECT
    user_id,
    COUNT(*) as lifetime_dep_count_total,
    SUM(amount_cents) / 100.0 as lifetime_dep_sum_total,
    MAX(created_at) as last_deposit
FROM replica_views.payments_view
WHERE user_id IN (1, 2, 3)
  AND action = 'deposit'
  AND success = true
GROUP BY user_id;

-- Get failed deposits count
SELECT
    user_id,
    COUNT(*) as lifetime_dep_count_failed
FROM replica_views.payments_view
WHERE user_id IN (1, 2, 3)
  AND action = 'deposit'
  AND success = false
GROUP BY user_id;

-- Get cashout stats
SELECT
    user_id,
    COUNT(*) as lifetime_cashout_count_total,
    SUM(amount_cents) / 100.0 as lifetime_cashout_sum_total,
    MAX(created_at) as last_cashout
FROM replica_views.payments_view
WHERE user_id IN (1, 2, 3)
  AND action = 'cashout'
  AND success = true
GROUP BY user_id;

-- Get pending cashouts
SELECT
    user_id,
    SUM(amount_cents) / 100.0 as cashout_pending
FROM replica_views.payments_view
WHERE user_id IN (1, 2, 3)
  AND action = 'cashout'
  AND success IS NULL
  AND processing = true
GROUP BY user_id;

-- Deposits by period (last 7/14/30/90 days)
SELECT
    user_id,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as dep_count_7d,
    SUM(amount_cents) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') / 100.0 as dep_sum_7d,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '14 days') as dep_count_14d,
    SUM(amount_cents) FILTER (WHERE created_at >= NOW() - INTERVAL '14 days') / 100.0 as dep_sum_14d,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as dep_count_30d,
    SUM(amount_cents) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') / 100.0 as dep_sum_30d,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '90 days') as dep_count_90d,
    SUM(amount_cents) FILTER (WHERE created_at >= NOW() - INTERVAL '90 days') / 100.0 as dep_sum_90d
FROM replica_views.payments_view
WHERE user_id IN (1, 2, 3)
  AND action = 'deposit'
  AND success = true
GROUP BY user_id;
```

---

## 4. casino_balance_transactions_view

**All casino transactions (bets, wins, bonuses)**

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint | Transaction ID |
| `account_id` | bigint | Wallet ID (FK to accounts_view) |
| `reference_id` | bigint | Reference to game/bonus |
| `reference_type` | varchar | Reference type |
| `amount_cents` | bigint | Amount (negative for bets) |
| `created_at` | timestamp | Transaction date |
| `bonus_amount_cents` | bigint | Bonus amount |
| `action` | enum | `bet`, `win`, `deposit`, `cashout`, `issued_bonus`, `canceled_bonus`, `addition`, `subtraction`, etc. |

**Action values:**
- `bet` - 51.3M rows (negative amounts)
- `win` - 11.6M rows
- `deposit` - 103K rows
- `cashout` - 44K rows
- `issued_bonus` - 39K rows
- `canceled_bonus` - 8K rows
- `addition` - 75 rows (manual credit)
- `subtraction` - 19 rows (manual debit)
- `rollback_bet`, `rollback_win` - game rollbacks
- `chargeback`, `refund`, `gift`, `promo_win`

```sql
-- Get bet/win stats (GGR)
SELECT
    a.user_id,
    SUM(CASE WHEN t.action = 'bet' THEN ABS(t.amount_cents) ELSE 0 END) / 100.0 as bet_sum,
    SUM(CASE WHEN t.action = 'win' THEN t.amount_cents ELSE 0 END) / 100.0 as win_sum,
    SUM(CASE WHEN t.action = 'bet' THEN ABS(t.amount_cents) ELSE 0 END) / 100.0 -
    SUM(CASE WHEN t.action = 'win' THEN t.amount_cents ELSE 0 END) / 100.0 as ggr
FROM replica_views.casino_balance_transactions_view t
JOIN replica_views.accounts_view a ON t.account_id = a.id
WHERE a.user_id IN (1, 2, 3)
GROUP BY a.user_id;

-- Get bet count and average
SELECT
    a.user_id,
    COUNT(*) as bet_count,
    AVG(ABS(t.amount_cents)) / 100.0 as avg_bet,
    MAX(t.created_at) as last_bet
FROM replica_views.casino_balance_transactions_view t
JOIN replica_views.accounts_view a ON t.account_id = a.id
WHERE a.user_id IN (1, 2, 3)
  AND t.action = 'bet'
GROUP BY a.user_id;

-- Get balance corrections
SELECT
    a.user_id,
    SUM(CASE
        WHEN t.action = 'addition' THEN t.amount_cents
        WHEN t.action = 'subtraction' THEN -t.amount_cents
        ELSE 0
    END) / 100.0 as balance_correction
FROM replica_views.casino_balance_transactions_view t
JOIN replica_views.accounts_view a ON t.account_id = a.id
WHERE a.user_id IN (1, 2, 3)
  AND t.action IN ('addition', 'subtraction')
GROUP BY a.user_id;
```

---

## 5. bonus_issues_view

**Issued bonuses**

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint | Bonus issue ID |
| `title` | varchar | Bonus name |
| `account_id` | bigint | Wallet ID |
| `amount_cents` | bigint | Bonus amount |
| `amount_wager_requirement_cents` | bigint | Wagering requirement |
| `created_at` | timestamp | Issue date |
| `updated_at` | timestamp | Last update |
| `strategy` | varchar | Bonus strategy |
| `status` | varchar | `issued`, `handle_bets`, `wager_done`, `canceled`, `expired`, `lost` |

**Status distribution:**
- `lost` - 50K
- `expired` - 12K
- `wager_done` - 10K
- `canceled` - 6K
- `handle_bets` - 183
- `issued` - 49

```sql
-- Get bonus breakdown per user (simplified, EUR only)
-- Full query with multi-currency: see bonus_data CTE in Complete Player Query
SELECT
    a.user_id,
    COUNT(*) as bonus_cnt,
    SUM(b.amount_cents) FILTER (WHERE b.status = 'wager_done') / 100.0 as bonus_wager_done,
    SUM(b.amount_cents) FILTER (WHERE b.status = 'lost') / 100.0 as bonus_lost,
    SUM(b.amount_cents) FILTER (WHERE b.status = 'handle_bets') / 100.0 as bonus_active,
    MAX(b.created_at) as last_bonus_dt
FROM replica_views.bonus_issues_view b
JOIN replica_views.accounts_view a ON b.account_id = a.id
WHERE a.user_id IN (1, 2, 3)
  AND (b.title IS NULL OR b.title NOT ILIKE '%test%')  -- Exclude test bonuses
GROUP BY a.user_id;
```

---

## 6. profiles_view

**User profile (name, country)**

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint | Profile ID |
| `user_id` | bigint | User ID |
| `first_name` | varchar | First name |
| `last_name` | varchar | Last name |
| `country` | varchar | Country code (2-letter) |
| `city` | varchar | City |
| `gender` | varchar | Gender |
| `receive_newsletters` | boolean | Newsletter subscription |
| `receive_promos` | boolean | Promo subscription |
| `receive_sms_promos` | boolean | SMS promo subscription |
| `updated_at` | timestamp | Last update |
| `language` | varchar | Preferred language |

```sql
-- Get user profile
SELECT user_id, first_name, last_name, country, gender
FROM replica_views.profiles_view
WHERE user_id IN (1, 2, 3);
```

---

## 7. profiles_view_2

**Extended profile (DOB, timezone)**

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint | Profile ID |
| `user_id` | bigint | User ID |
| `country` | varchar | Country code |
| `city` | varchar | City |
| `gender` | varchar | Gender |
| `receive_newsletters` | boolean | Newsletter subscription |
| `receive_promos` | boolean | Promo subscription |
| `receive_sms_promos` | boolean | SMS promo subscription |
| `updated_at` | timestamp | Last update |
| `date_of_birth` | date | Date of birth |
| `time_zone` | varchar | User timezone |
| `language` | varchar | Preferred language |

```sql
-- Get DOB and calculate age
SELECT
    user_id,
    date_of_birth,
    EXTRACT(YEAR FROM AGE(date_of_birth)) as age
FROM replica_views.profiles_view_2
WHERE user_id IN (1, 2, 3)
  AND date_of_birth IS NOT NULL;
```

---

## 8. user_sessions_view

**User sessions (device, location)**

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint | Session ID |
| `user_id` | bigint | User ID |
| `user_agent` | varchar | Browser user agent |
| `device_type` | varchar | Device type (mobile, desktop) |
| `country` | varchar | Session country |
| `closed_at` | timestamp | Session end |
| `created_at` | timestamp | Session start |
| `updated_at` | timestamp | Last activity |

```sql
-- Get session count (alternative to sign_in_count)
SELECT
    user_id,
    COUNT(*) as session_count,
    MAX(created_at) as last_session
FROM replica_views.user_sessions_view
WHERE user_id IN (1, 2, 3)
GROUP BY user_id;

-- Get device breakdown
SELECT
    user_id,
    device_type,
    COUNT(*) as sessions
FROM replica_views.user_sessions_view
WHERE user_id IN (1, 2, 3)
GROUP BY user_id, device_type;
```

---

## 9. user_deactivations_view

**User deactivation history**

| Column | Type | Description |
|--------|------|-------------|
| `id` | integer | Deactivation ID |
| `user_id` | bigint | User ID |
| `reason` | enum | Deactivation reason |
| `status` | enum | Current status |
| `created_at` | timestamp | Deactivation date |
| `updated_at` | timestamp | Last update |

```sql
-- Check deactivation status
SELECT user_id, reason, status, created_at
FROM replica_views.user_deactivations_view
WHERE user_id IN (1, 2, 3);
```

---

## 10. groups_view

**User groups/segments**

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint | Group ID |
| `created_at` | timestamp | Creation date |
| `name` | varchar | Group name |
| `updated_at` | timestamp | Last update |

```sql
-- Get all groups
SELECT id, name
FROM replica_views.groups_view
ORDER BY name;
```

---

## 11. users_groups_view

**User-group membership**

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint | Membership ID |
| `group_id` | bigint | Group ID |
| `user_id` | bigint | User ID |

```sql
-- Get user groups
SELECT
    ug.user_id,
    g.name as group_name
FROM replica_views.users_groups_view ug
JOIN replica_views.groups_view g ON ug.group_id = g.id
WHERE ug.user_id IN (1, 2, 3);
```

---

## 12. ad_tags_view

**Attribution/marketing tags**

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | bigint | User ID |
| `ga_id` | varchar | Google Analytics ID |
| `utm_source` | varchar | UTM source |
| `utm_medium` | varchar | UTM medium |
| `utm_campaign` | varchar | UTM campaign |
| `utm_content` | varchar | UTM content |
| `utm_term` | varchar | UTM term |
| `qtag` | varchar | Q-tag |
| `ref_code` | varchar | Referral code (stag) |

```sql
-- Get user attribution
SELECT user_id, utm_source, utm_campaign, ref_code
FROM replica_views.ad_tags_view
WHERE user_id IN (1, 2, 3);
```

---

## 13. casino_games_view

**Individual game sessions**

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint | Game session ID |
| `account_id` | bigint | Wallet ID |
| `balance_before` | bigint | Balance before game |
| `bonus_issue_id` | bigint | Associated bonus |
| `created_at` | timestamp | Game start |
| `finished_at` | timestamp | Game end |
| `balance_after` | bigint | Balance after game |
| `bets_sum` | bigint | Total bets in session |
| `payoff_sum` | bigint | Total wins in session |
| `game_id` | bigint | Game type ID |

```sql
-- Get game session stats
SELECT
    a.user_id,
    COUNT(*) as game_sessions,
    SUM(cg.bets_sum) / 100.0 as total_bets,
    SUM(cg.payoff_sum) / 100.0 as total_wins
FROM replica_views.casino_games_view cg
JOIN replica_views.accounts_view a ON cg.account_id = a.id
WHERE a.user_id IN (1, 2, 3)
GROUP BY a.user_id;
```

---

## 14. games_view / games_info_view

**Game catalog**

```sql
-- Get game info
SELECT id, title, provider, category
FROM replica_views.games_info_view
WHERE id IN (1, 2, 3);
```

---

## 15. phones_view

**User phone numbers**

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint | Phone ID |
| `user_id` | bigint | User ID |
| `active` | boolean | Is active |
| `verified_at` | timestamp | Verification date |
| `updated_at` | timestamp | Last update |

```sql
-- Check phone verification
SELECT user_id, active, verified_at
FROM replica_views.phones_view
WHERE user_id IN (1, 2, 3);
```

---

## Complete Player Query (ALL 83 FIELDS)

```sql
-- ============================================================
-- ALL-IN-ONE: Complete player data (83 fields)
-- Replace user_ids list with actual IDs or remove WHERE clause
-- ============================================================

WITH user_ids AS (
    -- Define target users (or remove for all users)
    SELECT unnest(ARRAY[1, 2, 3]::bigint[]) as id
),

-- ==================== 1. USERS ====================
user_data AS (
    SELECT
        u.id as user_id,
        u.email,
        u.created_at as reg_dt,
        u.confirmed_at as confirmed,
        u.locked_at IS NOT NULL as disabled,
        u.last_sign_in_at as last_login_dt,
        u.sign_in_count as login_cnt,
        u.psp_trusted_level as psp_trust_lvl,
        u.tags,
        u.last_sign_in_ip
    FROM replica_views.users_view u
    WHERE u.id IN (SELECT id FROM user_ids)
),

-- ==================== 2. DEACTIVATIONS ====================
deactivation_data AS (
    SELECT DISTINCT ON (user_id)
        user_id,
        reason as disabled_reason
    FROM replica_views.user_deactivations_view
    WHERE user_id IN (SELECT id FROM user_ids)
    ORDER BY user_id, created_at DESC
),

-- ==================== 3. PROFILES ====================
profile_data AS (
    SELECT
        p.user_id,
        p.first_name,
        p.last_name,
        p.country,
        p.city,
        p.receive_promos as promo_email,
        p.receive_sms_promos as promo_sms
    FROM replica_views.profiles_view p
    WHERE p.user_id IN (SELECT id FROM user_ids)
),

profile2_data AS (
    SELECT
        p2.user_id,
        p2.gender,
        p2.date_of_birth as dob,
        p2.language,
        p2.time_zone as timezone
    FROM replica_views.profiles_view_2 p2
    WHERE p2.user_id IN (SELECT id FROM user_ids)
),

-- ==================== 4. PHONES ====================
phone_data AS (
    SELECT
        user_id,
        verified_at IS NOT NULL as phone_verified
    FROM replica_views.phones_view
    WHERE user_id IN (SELECT id FROM user_ids)
      AND active = true
),

-- ==================== 5. AD TAGS (UTM) ====================
ad_tags_data AS (
    SELECT
        user_id,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_content,
        utm_term,
        ref_code,  -- Referral program, NOT affiliate stag
        ga_id,
        qtag
    FROM replica_views.ad_tags_view
    WHERE user_id IN (SELECT id FROM user_ids)
),

-- ==================== 6. DEVICE (Last Session) ====================
device_data AS (
    SELECT DISTINCT ON (user_id)
        user_id,
        device_type,
        CASE
            WHEN user_agent ILIKE '%iPhone%' THEN 'iPhone'
            WHEN user_agent ILIKE '%iPad%' THEN 'iPad'
            WHEN user_agent ILIKE '%Macintosh%' THEN 'Mac'
            WHEN user_agent ILIKE '%Android%' AND device_type = 'mobile' THEN 'Android'
            WHEN user_agent ILIKE '%Android%' AND device_type = 'tablet' THEN 'Tablet'
            WHEN user_agent ILIKE '%Windows%' THEN 'PC'
            WHEN user_agent ILIKE '%Linux%' THEN 'Linux PC‘
            ELSE 'Unknown'
        END as device
    FROM replica_views.user_sessions_view
    WHERE user_id IN (SELECT id FROM user_ids)
    ORDER BY user_id, created_at DESC
),

-- ==================== 7. ACCOUNTS (Balance) ====================
balance_data AS (
    SELECT
        user_id,
        id as wallet_id,
        currency,
        amount_cents / 100.0 as balance,
        updated_at as balance_adj_dt
    FROM replica_views.accounts_view
    WHERE user_id IN (SELECT id FROM user_ids)
      AND currency = 'EUR'  -- Primary EUR wallet
),

-- ==================== 8. GROUPS ====================
groups_data AS (
    SELECT
        ug.user_id,
        array_agg(g.name ORDER BY g.name) as groups
    FROM replica_views.users_groups_view ug
    JOIN replica_views.groups_view g ON ug.group_id = g.id
    WHERE ug.user_id IN (SELECT id FROM user_ids)
    GROUP BY ug.user_id
),

-- ==================== 9. PAYMENTS (Deposits) ====================
deposit_data AS (
    SELECT
        user_id,
        COUNT(*) FILTER (WHERE success = true) as dep_cnt,
        COUNT(*) FILTER (WHERE success = false) as dep_cnt_failed,
        SUM(amount_cents) FILTER (WHERE success = true) / 100.0 as dep_sum_eur,
        MAX(created_at) FILTER (WHERE success = true) as last_dep_dt,
        MIN(created_at) FILTER (WHERE success = true) as ftd_dt,
        (array_agg(amount_cents ORDER BY created_at) FILTER (WHERE success = true))[1] / 100.0 as ftd_sum,
        -- stag from first deposit with affiliate tag
        (array_agg(
            SUBSTRING(attributes->>'affiliateTag' FROM 'stag=([^,]+)')
            ORDER BY created_at
        ) FILTER (WHERE success = true AND attributes->>'affiliateTag' LIKE '%stag=%'
                   AND attributes->>'affiliateTag' NOT LIKE '%stag=null%'))[1] as stag,
        -- Period deposits
        COUNT(*) FILTER (WHERE success = true AND created_at >= NOW() - INTERVAL '7 days') as dep_cnt_7d,
        SUM(amount_cents) FILTER (WHERE success = true AND created_at >= NOW() - INTERVAL '7 days') / 100.0 as dep_sum_7d,
        COUNT(*) FILTER (WHERE success = true AND created_at >= NOW() - INTERVAL '14 days') as dep_cnt_14d,
        SUM(amount_cents) FILTER (WHERE success = true AND created_at >= NOW() - INTERVAL '14 days') / 100.0 as dep_sum_14d,
        COUNT(*) FILTER (WHERE success = true AND created_at >= NOW() - INTERVAL '30 days') as dep_cnt_30d,
        SUM(amount_cents) FILTER (WHERE success = true AND created_at >= NOW() - INTERVAL '30 days') / 100.0 as dep_sum_30d,
        COUNT(*) FILTER (WHERE success = true AND created_at >= NOW() - INTERVAL '90 days') as dep_cnt_90d,
        SUM(amount_cents) FILTER (WHERE success = true AND created_at >= NOW() - INTERVAL '90 days') / 100.0 as dep_sum_90d
    FROM replica_views.payments_view
    WHERE user_id IN (SELECT id FROM user_ids) AND action = 'deposit'
    GROUP BY user_id
),

-- ==================== 10. PAYMENTS (Cashouts) ====================
cashout_data AS (
    SELECT
        user_id,
        COUNT(*) FILTER (WHERE success = true) as wd_cnt,
        SUM(amount_cents) FILTER (WHERE success = true) / 100.0 as wd_sum_eur,
        MAX(created_at) FILTER (WHERE success = true) as last_wd_dt,
        SUM(amount_cents) FILTER (WHERE success IS NULL AND processing = true) / 100.0 as wd_pending_eur
    FROM replica_views.payments_view
    WHERE user_id IN (SELECT id FROM user_ids) AND action = 'cashout'
    GROUP BY user_id
),

-- ==================== 11. PAYMENTS (Chargeback/Refund) ====================
corrections_payments AS (
    SELECT
        user_id,
        SUM(amount_cents) FILTER (WHERE action = 'chargeback') / 100.0 as chargeback_eur,
        SUM(amount_cents) FILTER (WHERE action = 'refund') / 100.0 as refund_eur
    FROM replica_views.payments_view
    WHERE user_id IN (SELECT id FROM user_ids)
      AND action IN ('chargeback', 'refund')
    GROUP BY user_id
),

-- ==================== 12. CASINO TRANSACTIONS ====================
casino_data AS (
    SELECT
        a.user_id,
        -- Bets & Wins
        SUM(CASE WHEN t.action = 'bet' THEN ABS(t.amount_cents) ELSE 0 END) / 100.0 as bet_sum_eur,
        SUM(CASE WHEN t.action = 'win' THEN t.amount_cents ELSE 0 END) / 100.0 as win_sum_eur,
        COUNT(*) FILTER (WHERE t.action = 'bet') as bet_cnt,
        MAX(t.created_at) FILTER (WHERE t.action = 'bet') as last_bet_dt,
        -- Balance corrections
        SUM(CASE WHEN t.action = 'addition' THEN t.amount_cents ELSE 0 END) / 100.0 as addition_eur,
        SUM(CASE WHEN t.action = 'subtraction' THEN ABS(t.amount_cents) ELSE 0 END) / 100.0 as subtraction_eur,
        -- Gift (separate)
        SUM(CASE WHEN t.action = 'gift' THEN t.amount_cents ELSE 0 END) / 100.0 as gift_eur
    FROM replica_views.casino_balance_transactions_view t
    JOIN replica_views.accounts_view a ON t.account_id = a.id
    WHERE a.user_id IN (SELECT id FROM user_ids)
    GROUP BY a.user_id
),

-- ==================== 13. BONUS ISSUES (Full Breakdown) ====================
-- ⚠️ Исключены: бонусы с title ILIKE '%test%'
-- Валюты: FIAT (/100), Crypto (/divisor × EUR rate)
-- Divisors (verified from DB): BTC/LTC/BCH/USDT/DOGE=10^8, ETH=10^9, TRX/ADA=10^6
-- EUR rates (2025-12-25): BTC=94255, ETH=3486, LTC=105, BCH=496, TRX=0.24, USDT=0.95, ADA=0.90, DOGE=0.32
bonus_data AS (
    SELECT
        a.user_id,
        -- Использованные бонусы (реальный cost)
        SUM(CASE
            WHEN a.currency = 'EUR' THEN b.amount_cents / 100.0
            WHEN a.currency = 'GBP' THEN b.amount_cents / 100.0 * 1.17
            -- Crypto: / divisor × EUR rate
            WHEN a.currency = 'BTC' THEN b.amount_cents / 100000000.0 * 94255    -- 10^8 satoshi
            WHEN a.currency = 'ETH' THEN b.amount_cents / 1000000000.0 * 3486    -- 10^9 gwei
            WHEN a.currency = 'LTC' THEN b.amount_cents / 100000000.0 * 105      -- 10^8 litoshi
            WHEN a.currency = 'BCH' THEN b.amount_cents / 100000000.0 * 496      -- 10^8 satoshi
            WHEN a.currency = 'TRX' THEN b.amount_cents / 1000000.0 * 0.24       -- 10^6 sun
            WHEN a.currency = 'USDT' THEN b.amount_cents / 100000000.0 * 0.95    -- 10^8
            WHEN a.currency = 'ADA' THEN b.amount_cents / 1000000.0 * 0.90       -- 10^6 lovelace
            WHEN a.currency IN ('DOG', 'DOGE') THEN b.amount_cents / 100000000.0 * 0.32  -- 10^8
            ELSE b.amount_cents / 100.0  -- Fallback: assume cents
        END) FILTER (WHERE b.status = 'wager_done') as bonus_wager_done,
        SUM(CASE
            WHEN a.currency = 'EUR' THEN b.amount_cents / 100.0
            WHEN a.currency = 'GBP' THEN b.amount_cents / 100.0 * 1.17
            WHEN a.currency = 'BTC' THEN b.amount_cents / 100000000.0 * 94255
            WHEN a.currency = 'ETH' THEN b.amount_cents / 1000000000.0 * 3486
            WHEN a.currency = 'LTC' THEN b.amount_cents / 100000000.0 * 105
            WHEN a.currency = 'BCH' THEN b.amount_cents / 100000000.0 * 496
            WHEN a.currency = 'TRX' THEN b.amount_cents / 1000000.0 * 0.24
            WHEN a.currency = 'USDT' THEN b.amount_cents / 100000000.0 * 0.95
            WHEN a.currency = 'ADA' THEN b.amount_cents / 1000000.0 * 0.90
            WHEN a.currency IN ('DOG', 'DOGE') THEN b.amount_cents / 100000000.0 * 0.32
            ELSE b.amount_cents / 100.0
        END) FILTER (WHERE b.status = 'lost') as bonus_lost,
        SUM(CASE
            WHEN a.currency = 'EUR' THEN b.amount_cents / 100.0
            WHEN a.currency = 'GBP' THEN b.amount_cents / 100.0 * 1.17
            WHEN a.currency = 'BTC' THEN b.amount_cents / 100000000.0 * 94255
            WHEN a.currency = 'ETH' THEN b.amount_cents / 1000000000.0 * 3486
            WHEN a.currency = 'LTC' THEN b.amount_cents / 100000000.0 * 105
            WHEN a.currency = 'BCH' THEN b.amount_cents / 100000000.0 * 496
            WHEN a.currency = 'TRX' THEN b.amount_cents / 1000000.0 * 0.24
            WHEN a.currency = 'USDT' THEN b.amount_cents / 100000000.0 * 0.95
            WHEN a.currency = 'ADA' THEN b.amount_cents / 1000000.0 * 0.90
            WHEN a.currency IN ('DOG', 'DOGE') THEN b.amount_cents / 100000000.0 * 0.32
            ELSE b.amount_cents / 100.0
        END) FILTER (WHERE b.status = 'handle_bets') as bonus_active,
        -- Неиспользованные бонусы (не cost)
        SUM(CASE
            WHEN a.currency = 'EUR' THEN b.amount_cents / 100.0
            WHEN a.currency = 'GBP' THEN b.amount_cents / 100.0 * 1.17
            WHEN a.currency = 'BTC' THEN b.amount_cents / 100000000.0 * 94255
            WHEN a.currency = 'ETH' THEN b.amount_cents / 1000000000.0 * 3486
            WHEN a.currency = 'LTC' THEN b.amount_cents / 100000000.0 * 105
            WHEN a.currency = 'BCH' THEN b.amount_cents / 100000000.0 * 496
            WHEN a.currency = 'TRX' THEN b.amount_cents / 1000000.0 * 0.24
            WHEN a.currency = 'USDT' THEN b.amount_cents / 100000000.0 * 0.95
            WHEN a.currency = 'ADA' THEN b.amount_cents / 1000000.0 * 0.90
            WHEN a.currency IN ('DOG', 'DOGE') THEN b.amount_cents / 100000000.0 * 0.32
            ELSE b.amount_cents / 100.0
        END) FILTER (WHERE b.status = 'expired') as bonus_expired,
        SUM(CASE
            WHEN a.currency = 'EUR' THEN b.amount_cents / 100.0
            WHEN a.currency = 'GBP' THEN b.amount_cents / 100.0 * 1.17
            WHEN a.currency = 'BTC' THEN b.amount_cents / 100000000.0 * 94255
            WHEN a.currency = 'ETH' THEN b.amount_cents / 1000000000.0 * 3486
            WHEN a.currency = 'LTC' THEN b.amount_cents / 100000000.0 * 105
            WHEN a.currency = 'BCH' THEN b.amount_cents / 100000000.0 * 496
            WHEN a.currency = 'TRX' THEN b.amount_cents / 1000000.0 * 0.24
            WHEN a.currency = 'USDT' THEN b.amount_cents / 100000000.0 * 0.95
            WHEN a.currency = 'ADA' THEN b.amount_cents / 1000000.0 * 0.90
            WHEN a.currency IN ('DOG', 'DOGE') THEN b.amount_cents / 100000000.0 * 0.32
            ELSE b.amount_cents / 100.0
        END) FILTER (WHERE b.status = 'canceled') as bonus_canceled,
        SUM(CASE
            WHEN a.currency = 'EUR' THEN b.amount_cents / 100.0
            WHEN a.currency = 'GBP' THEN b.amount_cents / 100.0 * 1.17
            WHEN a.currency = 'BTC' THEN b.amount_cents / 100000000.0 * 94255
            WHEN a.currency = 'ETH' THEN b.amount_cents / 1000000000.0 * 3486
            WHEN a.currency = 'LTC' THEN b.amount_cents / 100000000.0 * 105
            WHEN a.currency = 'BCH' THEN b.amount_cents / 100000000.0 * 496
            WHEN a.currency = 'TRX' THEN b.amount_cents / 1000000.0 * 0.24
            WHEN a.currency = 'USDT' THEN b.amount_cents / 100000000.0 * 0.95
            WHEN a.currency = 'ADA' THEN b.amount_cents / 1000000.0 * 0.90
            WHEN a.currency IN ('DOG', 'DOGE') THEN b.amount_cents / 100000000.0 * 0.32
            ELSE b.amount_cents / 100.0
        END) FILTER (WHERE b.status = 'issued') as bonus_pending,
        COUNT(*) as bonus_cnt,
        MAX(b.created_at) as last_bonus_dt
    FROM replica_views.bonus_issues_view b
    JOIN replica_views.accounts_view a ON b.account_id = a.id
    WHERE a.user_id IN (SELECT id FROM user_ids)
      AND (b.title IS NULL OR b.title NOT ILIKE '%test%')  -- Исключаем тестовые бонусы
    GROUP BY a.user_id
)

-- ==================== FINAL SELECT ====================
SELECT
    -- === IDENTITY (1-2) ===
    u.user_id,
    u.email,

    -- === WALLET (3-6) ===
    b.wallet_id,
    b.currency,
    COALESCE(b.balance, 0) as balance,
    b.balance_adj_dt,

    -- === REGISTRATION (7-14) ===
    u.reg_dt,
    u.confirmed,
    u.disabled,
    dd.disabled_reason,
    u.last_login_dt,
    u.login_cnt,
    u.psp_trust_lvl,
    u.tags,

    -- === PROFILE (15-24) ===
    p.first_name,
    p.last_name,
    p.country,
    p.city,
    p2.gender,
    p2.dob,
    p2.language,
    p2.timezone,
    p.promo_email,
    p.promo_sms,

    -- === PHONE (25) ===
    COALESCE(ph.phone_verified, false) as phone_verified,

    -- === UTM (26-33) ===
    at.utm_source,
    at.utm_medium,
    at.utm_campaign,
    at.utm_content,
    at.utm_term,
    at.ref_code,
    at.ga_id,
    at.qtag,

    -- === DEVICE (34-35) ===
    dv.device_type,
    dv.device,

    -- === DEPOSITS (36-43) ===
    COALESCE(dep.ftd_sum, 0) as ftd_sum,
    dep.ftd_dt,
    dep.last_dep_dt,
    COALESCE(dep.dep_sum_eur, 0) as dep_sum_eur,
    COALESCE(dep.dep_cnt, 0) as dep_cnt,
    COALESCE(dep.dep_cnt_failed, 0) as dep_cnt_failed,
    dep.stag,  -- Affiliate tracking tag (10.5% filled)

    -- === WITHDRAWALS (44-46) ===
    COALESCE(wd.wd_sum_eur, 0) as wd_sum_eur,
    COALESCE(wd.wd_cnt, 0) as wd_cnt,
    COALESCE(wd.wd_pending_eur, 0) as wd_pending_eur,
    wd.last_wd_dt,

    -- === CORRECTIONS (46-47) ===
    COALESCE(cp.chargeback_eur, 0) as chargeback_eur,
    COALESCE(cp.refund_eur, 0) as refund_eur,

    -- === CASINO (48-53) ===
    c.last_bet_dt,
    COALESCE(c.bet_sum_eur, 0) as bet_sum_eur,
    COALESCE(c.win_sum_eur, 0) as win_sum_eur,
    COALESCE(c.bet_cnt, 0) as bet_cnt,
    COALESCE(c.addition_eur, 0) as addition_eur,
    COALESCE(c.subtraction_eur, 0) as subtraction_eur,
    COALESCE(c.gift_eur, 0) as gift_eur,

    -- === BONUS (54-61) ===
    bo.last_bonus_dt,
    COALESCE(bo.bonus_wager_done, 0) as bonus_wager_done,  -- Отыгранные
    COALESCE(bo.bonus_lost, 0) as bonus_lost,              -- Проигранные
    COALESCE(bo.bonus_active, 0) as bonus_active,          -- В игре (handle_bets)
    COALESCE(bo.bonus_expired, 0) as bonus_expired,        -- Истёкшие (не использованы)
    COALESCE(bo.bonus_canceled, 0) as bonus_canceled,      -- Отменённые (не использованы)
    COALESCE(bo.bonus_pending, 0) as bonus_pending,        -- Выданные, ещё не играл
    COALESCE(bo.bonus_cnt, 0) as bonus_cnt,                -- Всего бонусов

    -- === GROUPS (62) ===
    gr.groups,

    -- === CALCULATED METRICS (63-73) ===
    -- in_out = dep - wd (денежный поток)
    COALESCE(dep.dep_sum_eur, 0) - COALESCE(wd.wd_sum_eur, 0) as in_out,
    -- GGR
    COALESCE(c.bet_sum_eur, 0) - COALESCE(c.win_sum_eur, 0) as ggr,
    -- bonus_used = wager_done + lost + active (реальный cost)
    COALESCE(bo.bonus_wager_done, 0) + COALESCE(bo.bonus_lost, 0)
        + COALESCE(bo.bonus_active, 0) as bonus_used,
    -- corrected_eur
    COALESCE(c.addition_eur, 0) - COALESCE(c.subtraction_eur, 0) as corrected_eur,
    -- corrections = chargeback + refund + balance_corrections
    COALESCE(cp.chargeback_eur, 0) + COALESCE(cp.refund_eur, 0) +
        (COALESCE(c.addition_eur, 0) - COALESCE(c.subtraction_eur, 0)) as corrections,
    -- NGR = GGR - bonus_used - corrections
    (COALESCE(c.bet_sum_eur, 0) - COALESCE(c.win_sum_eur, 0)) -
        (COALESCE(bo.bonus_wager_done, 0) + COALESCE(bo.bonus_lost, 0) + COALESCE(bo.bonus_active, 0)) -
        (COALESCE(cp.chargeback_eur, 0) + COALESCE(cp.refund_eur, 0) +
         COALESCE(c.addition_eur, 0) - COALESCE(c.subtraction_eur, 0)) as ngr,
    -- avg_dep
    CASE WHEN COALESCE(dep.dep_cnt, 0) > 0
         THEN COALESCE(dep.dep_sum_eur, 0) / dep.dep_cnt
         ELSE 0 END as avg_dep,
    -- avg_bet
    CASE WHEN COALESCE(c.bet_cnt, 0) > 0
         THEN COALESCE(c.bet_sum_eur, 0) / c.bet_cnt
         ELSE 0 END as avg_bet,
    -- bonus_dep_rate = bonus_used / deposits * 100
    CASE WHEN COALESCE(dep.dep_sum_eur, 0) > 0
         THEN ((COALESCE(bo.bonus_wager_done, 0) + COALESCE(bo.bonus_lost, 0) + COALESCE(bo.bonus_active, 0))
               / dep.dep_sum_eur) * 100
         ELSE 0 END as bonus_dep_rate,
    -- bonus_ggr_rate = bonus_used / ggr * 100
    CASE WHEN (COALESCE(c.bet_sum_eur, 0) - COALESCE(c.win_sum_eur, 0)) > 0
         THEN ((COALESCE(bo.bonus_wager_done, 0) + COALESCE(bo.bonus_lost, 0) + COALESCE(bo.bonus_active, 0))
               / (COALESCE(c.bet_sum_eur, 0) - COALESCE(c.win_sum_eur, 0))) * 100
         ELSE 0 END as bonus_ggr_rate,
    -- spend = (dep - wd - chargeback - refund) - balance - pending_wd
    (COALESCE(dep.dep_sum_eur, 0) - COALESCE(wd.wd_sum_eur, 0)
        - COALESCE(cp.chargeback_eur, 0) - COALESCE(cp.refund_eur, 0)) -
        COALESCE(b.balance, 0) - COALESCE(wd.wd_pending_eur, 0) as spend,

    -- === PERIOD METRICS ===
    COALESCE(dep.dep_cnt_7d, 0) as dep_cnt_7d,
    COALESCE(dep.dep_sum_7d, 0) as dep_sum_7d,
    COALESCE(dep.dep_cnt_14d, 0) as dep_cnt_14d,
    COALESCE(dep.dep_sum_14d, 0) as dep_sum_14d,
    COALESCE(dep.dep_cnt_30d, 0) as dep_cnt_30d,
    COALESCE(dep.dep_sum_30d, 0) as dep_sum_30d,
    COALESCE(dep.dep_cnt_90d, 0) as dep_cnt_90d,
    COALESCE(dep.dep_sum_90d, 0) as dep_sum_90d

FROM user_data u
LEFT JOIN deactivation_data dd ON u.user_id = dd.user_id
LEFT JOIN profile_data p ON u.user_id = p.user_id
LEFT JOIN profile2_data p2 ON u.user_id = p2.user_id
LEFT JOIN phone_data ph ON u.user_id = ph.user_id
LEFT JOIN ad_tags_data at ON u.user_id = at.user_id
LEFT JOIN device_data dv ON u.user_id = dv.user_id
LEFT JOIN balance_data b ON u.user_id = b.user_id
LEFT JOIN groups_data gr ON u.user_id = gr.user_id
LEFT JOIN deposit_data dep ON u.user_id = dep.user_id
LEFT JOIN cashout_data wd ON u.user_id = wd.user_id
LEFT JOIN corrections_payments cp ON u.user_id = cp.user_id
LEFT JOIN casino_data c ON u.user_id = c.user_id
LEFT JOIN bonus_data bo ON u.user_id = bo.user_id

ORDER BY u.user_id;
```

---

## Field Mapping: APP_Metrics.md → replica_views

| APP_Metrics Field | Source | View | Column | SQL |
|-------------------|--------|------|--------|-----|
| `user_id` | CIO | users_view | `id` | `SELECT id FROM users_view` |
| `wallet_id` | POST | accounts_view | `id` | `SELECT id FROM accounts_view WHERE user_id=?` |
| `sign_in_count` | POST | users_view | `sign_in_count` | `SELECT sign_in_count FROM users_view WHERE id=?` |
| `psp_trusted_level` | POST | users_view | `psp_trusted_level` | `SELECT psp_trusted_level FROM users_view WHERE id=?` |
| `disabled` | CIO | users_view | `locked_at` | `SELECT locked_at IS NOT NULL FROM users_view WHERE id=?` |
| `duplicates` | POST | users_view | `last_sign_in_ip` | IP match query (see above) |
| `balance` | POST | accounts_view | `amount_cents` | `SELECT amount_cents/100.0 FROM accounts_view WHERE user_id=?` |
| `account_id_date` | POST | accounts_view | `updated_at` | `SELECT updated_at FROM accounts_view WHERE user_id=?` |
| `ftd_sum` | POST | payments_view | `amount_cents` | First deposit query (see above) |
| `ftd_date` | POST | payments_view | `created_at` | First deposit query (see above) |
| `lifetime_dep_sum_total` | CIO | payments_view | `SUM(amount_cents)` | `WHERE action='deposit' AND success=true` |
| `lifetime_dep_count_total` | CIO | payments_view | `COUNT(*)` | `WHERE action='deposit' AND success=true` |
| `lifetime_dep_count_failed` | POST | payments_view | `COUNT(*)` | `WHERE action='deposit' AND success=false` |
| `lifetime_cashout_sum_total` | CIO | payments_view | `SUM(amount_cents)` | `WHERE action='cashout' AND success=true` |
| `lifetime_cashout_count_total` | CIO | payments_view | `COUNT(*)` | `WHERE action='cashout' AND success=true` |
| `last_deposit` | CIO | payments_view | `MAX(created_at)` | `WHERE action='deposit' AND success=true` |
| `last_cashout` | POST | payments_view | `MAX(created_at)` | `WHERE action='cashout' AND success=true` |
| `cashout_pending` | POST | payments_view | `SUM(amount_cents)` | `WHERE action='cashout' AND success IS NULL AND processing=true` |
| `bet_sum` | POST | casino_balance_transactions | `SUM(ABS(amount_cents))` | `WHERE action='bet'` |
| `win_sum` | POST | casino_balance_transactions | `SUM(amount_cents)` | `WHERE action='win'` |
| `bet_count` | POST | casino_balance_transactions | `COUNT(*)` | `WHERE action='bet'` |
| `last_bet` | POST | casino_balance_transactions | `MAX(created_at)` | `WHERE action='bet'` |
| `balance_correction` | POST | casino_balance_transactions | `SUM(amount_cents)` | `WHERE action IN ('addition','subtraction')` |
| `bonus_*` | POST | bonus_issues_view | `SUM(amount_cents)` | By status (wager_done, lost, etc.) |
| `last_bonus_dt` | POST | bonus_issues_view | `MAX(created_at)` | Last bonus date |
| `gift_eur` | POST | casino_balance_transactions | `SUM(amount_cents)` | `WHERE action='gift'` |
| `device` | POST | user_sessions_view | `user_agent` | Last session (parsed) |
| `device_type` | POST | user_sessions_view | `device_type` | `mobile`, `desktop`, `tablet` |

---

## 16. Ad Tags Fill Rates

**Source:** `ad_tags_view` (91,537 records)

| Field | Count | % | Notes |
|-------|-------|---|-------|
| `ga_id` | 91,536 | 100% | Google Analytics ID |
| `utm_source` | 3,039 | 3.3% | |
| `utm_medium` | 3,040 | 3.3% | |
| `utm_campaign` | 3,040 | 3.3% | |
| `utm_content` | 2,747 | 3.0% | |
| `utm_term` | 25 | 0.03% | Nearly empty |
| `ref_code` | 35 | 0.04% | **See note below** |
| `qtag` | 0 | 0% | Empty |


### ref_code — Referral Program ("Приведи друга")

`ref_code` в `ad_tags_view` — это **реферальный код**, НЕ affiliate stag.
- Заполнен только у 35 пользователей (0.04%)
- Используется для программы "Приведи друга"

### stag (Affiliate Tracking) — ДОСТУПЕН

**stag хранится в `payments_view.attributes` (jsonb):**

| Field | Fill Rate | Description |
|-------|-----------|-------------|
| `stagTrafficSource` | 10.5% | Traffic source |
| `stagHttpReferrer` | 10.5% | HTTP referrer |
| `stagAffiliateTrackingLink` | 10.5% | Tracking link (kaaslink.me) |
| `affiliateTag` | 10.5% | Contains stag value |

**Extraction:**
```sql
-- Extract stag from affiliateTag
SELECT
    user_id,
    SUBSTRING(attributes->>'affiliateTag' FROM 'stag=([^,]+)') as stag
FROM replica_views.payments_view
WHERE action = 'deposit' AND success = true
  AND attributes->>'affiliateTag' LIKE '%stag=%'
  AND attributes->>'affiliateTag' NOT LIKE '%stag=null%'
```

**Format:** `affiliate_id_tracking_id` (e.g., `246084_67478df69aa026bafd0aab1d`)

**Top affiliates by deposits:**
| stag | Deposits |
|------|----------|
| 247771_* | 459 |
| 246234_* | 458 |
| 246084_* | 426+ |
| 246328_* | 331 |

**Вывод:** stag доступен для ~10.5% депозитов (22K из 212K).

---

## 17. Device Detection

**Source:** `user_sessions_view`

| device_type | Count |
|-------------|-------|
| mobile | 483K |
| desktop | 59K |
| tablet | 4K |

### Device Parsing from user_agent

```sql
-- Get device breakdown by user
WITH last_sessions AS (
    SELECT
        user_id,
        device_type,
        user_agent,
        ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
    FROM replica_views.user_sessions_view
    WHERE user_id IN (1, 2, 3)
)
SELECT
    user_id,
    device_type,
    CASE
        WHEN user_agent ILIKE '%iPhone%' THEN 'iPhone'
        WHEN user_agent ILIKE '%iPad%' THEN 'iPad'
        WHEN user_agent ILIKE '%Macintosh%' THEN 'Mac'
        WHEN user_agent ILIKE '%Android%' AND device_type = 'mobile' THEN 'Android'
        WHEN user_agent ILIKE '%Android%' AND device_type = 'tablet' THEN 'Tablet'
        WHEN user_agent ILIKE '%Windows%' THEN 'PC'
        WHEN user_agent ILIKE '%Linux%' THEN 'Linux PC‘
        ELSE 'Unknown'
    END as device
FROM last_sessions
WHERE rn = 1;
```

### Device Distribution (Total)

| Device | Sessions |
|--------|----------|
| Android | 265,246 |
| iPhone | 218,091 |
| PC | 32,217 |
| Linux PC | 14,570 |
| Mac | 10,791 |
| Tablet | 2,958 |
| iPad | 954 |

---

## 18. Gift Transactions (Separate from NGR)

**Not included in NGR corrections** — tracked separately.

```sql
-- Get gift amounts per user
SELECT
    a.user_id,
    SUM(t.amount_cents) / 100.0 as gift_eur
FROM replica_views.casino_balance_transactions_view t
JOIN replica_views.accounts_view a ON t.account_id = a.id
WHERE a.user_id IN (1, 2, 3)
  AND t.action = 'gift'
GROUP BY a.user_id;
```

**Total gift volume:** €7.65M (excluded from corrections)

---

## Complete Field List (83 fields)

### Direct Fields (1-35)

| # | Field | View | Notes |
|---|-------|------|-------|
| 1 | `user_id` | users_view | PK |
| 2 | `email` | users_view | |
| 3 | `wallet_id` | accounts_view | EUR wallet |
| 4 | `currency` | accounts_view | EUR |
| 5 | `balance` | accounts_view | amount_cents/100 |
| 6 | `balance_adj_dt` | accounts_view | updated_at |
| 7 | `reg_dt` | users_view | created_at |
| 8 | `confirmed` | users_view | confirmed_at |
| 9 | `disabled` | users_view | locked_at IS NOT NULL |
| 10 | `disabled_reason` | user_deactivations_view | reason |
| 11 | `last_login_dt` | users_view | last_sign_in_at |
| 12 | `login_cnt` | users_view | sign_in_count |
| 13 | `psp_trust_lvl` | users_view | psp_trusted_level |
| 14 | `tags` | users_view | |
| 15 | `first_name` | profiles_view | |
| 16 | `last_name` | profiles_view | |
| 17 | `country` | profiles_view | |
| 18 | `city` | profiles_view | |
| 19 | `gender` | profiles_view_2 | |
| 20 | `dob` | profiles_view_2 | date_of_birth |
| 21 | `language` | profiles_view_2 | |
| 22 | `timezone` | profiles_view_2 | time_zone |
| 23 | `promo_email` | profiles_view | receive_promos |
| 24 | `promo_sms` | profiles_view | receive_sms_promos |
| 25 | `phone_verified` | phones_view | verified_at IS NOT NULL |
| 26 | `utm_source` | ad_tags_view | 3.3% filled |
| 27 | `utm_medium` | ad_tags_view | 3.3% filled |
| 28 | `utm_campaign` | ad_tags_view | 3.3% filled |
| 29 | `utm_content` | ad_tags_view | 3.0% filled |
| 30 | `utm_term` | ad_tags_view | ~0% |
| 31 | `ref_code` | ad_tags_view | Referral program |
| 32 | `ga_id` | ad_tags_view | 100% filled |
| 33 | `qtag` | ad_tags_view | 0% |
| 34 | `device_type` | user_sessions_view | Last session |
| 35 | `device` | user_sessions_view | Parsed from user_agent |

### Aggregated Fields (36-64)

| # | Field | Source | Notes |
|---|-------|--------|-------|
| 36 | `ftd_sum` | payments_view | First deposit amount |
| 37 | `ftd_dt` | payments_view | First deposit date |
| 38 | `last_dep_dt` | payments_view | MAX deposit date |
| 39 | `dep_sum_eur` | payments_view | SUM deposits |
| 40 | `dep_cnt` | payments_view | COUNT deposits |
| 41 | `dep_cnt_failed` | payments_view | COUNT failed deposits |
| 42 | `stag` | payments_view.attributes | 10.5% filled |
| 43 | `wd_sum_eur` | payments_view | SUM cashouts |
| 44 | `wd_cnt` | payments_view | COUNT cashouts |
| 45 | `wd_pending_eur` | payments_view | Pending withdrawals |
| 46 | `last_wd_dt` | payments_view | MAX cashout date |
| 47 | `chargeback_eur` | payments_view | SUM chargebacks |
| 48 | `refund_eur` | payments_view | SUM refunds |
| 49 | `last_bet_dt` | casino_balance_transactions | MAX bet date |
| 50 | `bet_sum_eur` | casino_balance_transactions | SUM bets |
| 51 | `win_sum_eur` | casino_balance_transactions | SUM wins |
| 52 | `bet_cnt` | casino_balance_transactions | COUNT bets |
| 53 | `addition_eur` | casino_balance_transactions | Balance additions |
| 54 | `subtraction_eur` | casino_balance_transactions | Balance subtractions |
| 55 | `gift_eur` | casino_balance_transactions | Gifts (separate) |
| 56 | `last_bonus_dt` | bonus_issues_view | MAX bonus date |
| 57 | `bonus_wager_done` | bonus_issues_view | status='wager_done' |
| 58 | `bonus_lost` | bonus_issues_view | status='lost' |
| 59 | `bonus_active` | bonus_issues_view | status='handle_bets' |
| 60 | `bonus_expired` | bonus_issues_view | status='expired' |
| 61 | `bonus_canceled` | bonus_issues_view | status='canceled' |
| 62 | `bonus_pending` | bonus_issues_view | status='issued' |
| 63 | `bonus_cnt` | bonus_issues_view | COUNT all bonuses |
| 64 | `groups` | users_groups_view | ARRAY_AGG |

### Calculated Metrics (65-75)

| # | Field | Formula | Description |
|---|-------|---------|-------------|
| 65 | `in_out` | `dep - wd` | Денежный поток |
| 66 | `ggr` | `bet - win` | Gross Gaming Revenue |
| 67 | `bonus_used` | `wager_done + lost + active` | **Реальная стоимость бонусов** |
| 68 | `corrected_eur` | `addition - subtraction` | Balance corrections |
| 69 | `corrections` | `chargeback + refund + corrected` | Все коррекции |
| 70 | `ngr` | `ggr - bonus_used - corrections` | **Net Gaming Revenue** |
| 71 | `avg_dep` | `dep_sum / dep_cnt` | Average deposit |
| 72 | `avg_bet` | `bet_sum / bet_cnt` | Average bet |
| 73 | `bonus_dep_rate` | `(bonus_used / dep) × 100` | % от депозитов |
| 74 | `bonus_ggr_rate` | `(bonus_used / ggr) × 100` | % от GGR |
| 75 | `spend` | `in_out - chargeback - refund - balance - pending` | Реально потрачено |

### Period-Based Metrics (76-83)

| # | Field | Periods |
|---|-------|---------|
| 76-77 | `dep_cnt_7d`, `dep_sum_7d` | 7 days |
| 78-79 | `dep_cnt_14d`, `dep_sum_14d` | 14 days |
| 80-81 | `dep_cnt_30d`, `dep_sum_30d` | 30 days |
| 82-83 | `dep_cnt_90d`, `dep_sum_90d` | 90 days |

---

## Bonus Cost Logic

### Статусы бонусов (bonus_issues_view)

| Status | Использован? | Включать в cost? |
|--------|-------------|------------------|
| `wager_done` | ✅ Да, отыграл | ✅ **ДА** — платим |
| `lost` | ✅ Да, проиграл | ✅ **ДА** — играл на наши деньги |
| `handle_bets` | ✅ Да, играет сейчас | ✅ **ДА** — использует |
| `expired` | ❌ Не использовал | ❌ НЕТ — не платим |
| `canceled` | ❌ Не использовал | ❌ НЕТ — не платим |
| `issued` | ❌ Ещё не начал | ❌ НЕТ — не считаем |

### Формула

```
bonus_used = bonus_wager_done + bonus_lost + bonus_active
NGR = GGR - bonus_used - corrections
```

---

## Currency Conversion

### Проблема

Данные хранятся в разных валютах:
- **EUR** — основная (~95% транзакций)
- **GBP** — британские игроки (~4%)
- **Crypto** — BTC, ETH, LTC, USDT (~1%)

Для корректной аналитики нужно конвертировать всё в EUR.

### Текущее решение (Hardcode)

**Формат хранения в БД (verified):**
- `amount_cents` хранит суммы в минимальных единицах валюты
- FIAT: cents (/ 100)
- Crypto: разные divisors в зависимости от валюты

```sql
CASE
    WHEN currency = 'EUR' THEN amount_cents / 100.0
    WHEN currency = 'GBP' THEN amount_cents / 100.0 * 1.17
    -- Crypto: / divisor × EUR rate
    WHEN currency = 'BTC' THEN amount_cents / 100000000.0 * 94255    -- 10^8 satoshi
    WHEN currency = 'ETH' THEN amount_cents / 1000000000.0 * 3486    -- 10^9 gwei
    WHEN currency = 'LTC' THEN amount_cents / 100000000.0 * 105      -- 10^8 litoshi
    WHEN currency = 'BCH' THEN amount_cents / 100000000.0 * 496      -- 10^8 satoshi
    WHEN currency = 'TRX' THEN amount_cents / 1000000.0 * 0.24       -- 10^6 sun
    WHEN currency = 'USDT' THEN amount_cents / 100000000.0 * 0.95    -- 10^8
    WHEN currency = 'ADA' THEN amount_cents / 1000000.0 * 0.90       -- 10^6 lovelace
    WHEN currency IN ('DOG', 'DOGE') THEN amount_cents / 100000000.0 * 0.32  -- 10^8
    ELSE amount_cents / 100.0  -- Fallback
END
```

**Divisors (verified from DB 2025-12-25):**
| Currency | Divisor | Unit | DB Example | Result |
|----------|---------|------|------------|--------|
| EUR | 100 | cents | 10000 | 100.00 EUR |
| GBP | 100 | pence | 10000 | 117.00 EUR |
| BTC | 10^8 | satoshi | 20000 | 0.0002 BTC |
| ETH | 10^9 | gwei | 1000000000 | 1.0 ETH |
| LTC | 10^8 | litoshi | 100000000 | 1.0 LTC |
| BCH | 10^8 | satoshi | 1000000000 | 10.0 BCH |
| TRX | 10^6 | sun | 1000000 | 1.0 TRX |
| USDT | 10^8 | - | 100000000 | 1.0 USDT |
| ADA | 10^6 | lovelace | 1000000 | 1.0 ADA |
| DOGE | 10^8 | koinu | 100000000 | 1.0 DOGE |

**EUR Rates (2025-12-25, CoinGecko):**
| Currency | EUR Rate |
|----------|----------|
| BTC | €94,255 |
| ETH | €3,486 |
| LTC | €105 |
| BCH | €496 |
| TRX | €0.24 |
| USDT | €0.95 |
| ADA | €0.90 |
| DOGE | €0.32 |

**Минусы:**
- Курсы статичные (нужно обновлять при сильных изменениях)
- При добавлении новой криптовалюты нужно менять код

### Рекомендуемое решение (Dynamic Rates)

**1. Источники курсов:**
- **FIAT (GBP):** ECB API (бесплатный, официальный)
- **Crypto:** CoinGecko API (бесплатный, 10-50 req/min)

**2. Структура хранения:**
```
config/
└── exchange_rates.json
```

```json
{
  "updated": "2025-01-01T00:00:00Z",
  "base": "EUR",
  "rates": {
    "GBP": {
      "2024-11": 1.16,
      "2024-12": 1.17,
      "2025-01": 1.18
    },
    "BTC": {
      "2024-11": 87000,
      "2024-12": 95000,
      "2025-01": 98000
    },
    "ETH": {
      "2024-11": 3200,
      "2024-12": 3400,
      "2025-01": 3500
    }
  }
}
```

**3. Python скрипт для обновления:**
```python
# fetch_rates.py — запускать 1-го числа каждого месяца
import requests
from datetime import datetime

def fetch_ecb_rates():
    """ECB API для FIAT"""
    url = "https://api.frankfurter.app/latest?from=EUR"
    return requests.get(url).json()

def fetch_crypto_rates():
    """CoinGecko API для Crypto"""
    url = "https://api.coingecko.com/api/v3/simple/price"
    params = {"ids": "bitcoin,ethereum,litecoin,tether", "vs_currencies": "eur"}
    return requests.get(url, params=params).json()
```

**4. SQL с динамическими курсами:**
```sql
WITH exchange_rates AS (
    -- Генерируется из exchange_rates.json
    SELECT '2024-12-01'::date as month_start, 'GBP'::varchar as currency, 1.17::numeric as rate
    UNION ALL SELECT '2025-01-01', 'GBP', 1.18
    UNION ALL SELECT '2024-12-01', 'BTC', 95000
    UNION ALL SELECT '2025-01-01', 'BTC', 98000
    -- ...
),
bonus_data AS (
    SELECT
        a.user_id,
        SUM(
            CASE
                WHEN a.currency = 'EUR' THEN b.amount_cents / 100.0
                ELSE b.amount_cents /
                    CASE WHEN a.currency IN ('BTC','ETH','LTC','USDT') THEN 1000000000.0 ELSE 100.0 END
                    * COALESCE(
                        (SELECT rate FROM exchange_rates er
                         WHERE er.currency = a.currency
                         AND er.month_start <= b.created_at
                         ORDER BY er.month_start DESC LIMIT 1),
                        1)
            END
        ) FILTER (WHERE b.status = 'wager_done') as bonus_wager_done,
        -- ...
    FROM replica_views.bonus_issues_view b
    -- ...
)
```

### Приоритет внедрения

| Приоритет | Валюта | Доля | Решение |
|-----------|--------|------|---------|
| 🔴 Критично | EUR | ~95% | Уже работает |
| 🟡 Средний | GBP | ~4% | Hardcode 1.17 (±3% погрешность) |
| 🟢 Низкий | Crypto | ~1% | Не конвертируем (малая доля) |

**Вывод:** Для MVP достаточно hardcode. Динамические курсы — улучшение на будущее.

---

## Summary: 83 Fields Total

- **35** Direct fields (no calculation)
- **29** Aggregated fields (SQL aggregates)
- **11** Calculated metrics (formulas)
- **8** Period-based metrics (4 periods × 2)

---

*Generated: 2025-12-25*
