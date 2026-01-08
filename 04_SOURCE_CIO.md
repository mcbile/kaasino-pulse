# Customer.io Schema Map

> Workspace: **162816** (kaasino.com)
> Region: **EU** (api-eu.customer.io)
> Site ID: `a12b6530c5ae0baed64d`
> Attributes: **114** per customer

## Related Documents

| Document | Purpose | Link |
|----------|---------|------|
| **03_SOURCE.md** | Unified Field Glossary — canonical field names, CIO→Internal mapping | [→ 03_SOURCE.md](03_SOURCE.md) |
| **05_SOURCE_POSTQ.md** | PostgreSQL views — POST-only fields, SQL queries | [→ 05_SOURCE_POSTQ.md](05_SOURCE_POSTQ.md) |

---

## Quick Reference

| Resource | Endpoint | Count |
|----------|----------|-------|
| Customers | `/v1/api/customers/{id}` | ~92K |
| Segments | `/v1/api/segments` | 80+ |
| Campaigns | `/v1/api/campaigns` | 60+ |
| Activities | `/v1/api/customers/{id}/activities` | per user |

---

## 1. Customer Identifier Format

```
kaasino:{user_id}
```

Example: `kaasino:10` → user_id = 10

### Identifiers Object
| Field | Description |
|-------|-------------|
| `id` | `kaasino:{user_id}` |
| `cio_id` | CIO internal ID (hex) |
| `email` | Email address |

---

## 2. Customer Attributes

### 2.1 Identity
| Attribute | Type | Example |
|-----------|------|---------|
| `id` | string | kaasino:10 |
| `cio_id` | string | 80f80900090a |
| `email` | string | user@gmail.com |
| `phone` | string | +491741477777 |
| `anonymous_id` | string | da6718a4-... |
| `subscription_token` | string | 3e098655... |
| `ga_id` | string | 425fad1c-... |

### 2.2 Profile
| Attribute | Type | Example |
|-----------|------|---------|
| `first_name` | string | Mike |
| `last_name` | string | van Damm |
| `country` | string | NL |
| `last_login_country` | string | DE |
| `gender` | string | m/f |
| `date_of_birth` | timestamp | 1014163200 |
| `locale` | string | en |
| `timezone` | string | Europe/Brussels |
| `currency` | string | EUR |

### 2.3 Account Status
| Attribute | Type | Values |
|-----------|------|--------|
| `created_at` | timestamp | Unix |
| `confirmed_at` | timestamp | Unix |
| `disabled` | string | none/disabled/cooling_off/self_excluded |
| `duplicates` | string | true/false |
| `server_codename` | string | kaasino |
| `site_domain` | string | kaas.go2play.link |

### 2.4 Marketing Preferences
| Attribute | Type | Default |
|-----------|------|---------|
| `accept_bonuses` | string | true |
| `receive_promos` | string | true |
| `receive_sms_promos` | string | true |
| `receive_promos_via_phone_calls` | string | false |
| `agreed_to_partner_promotions` | string | false |
| `unsubscribed` | boolean | false |

### 2.5 Tracking
| Attribute | Type | Example |
|-----------|------|---------|
| `stag` | string | 246054_6689861c... |
| `tags` | JSON array | ["vip","verified"] |
| `groups` | JSON array | ["00002","00019"] |

### 2.6 Deposits — Lifetime
| Attribute | Description |
|-----------|-------------|
| `lifetime_deposit_count_total` | Total deposit count |
| `lifetime_deposit_count_eur` | EUR deposits count |
| `lifetime_deposit_count_gbp` | GBP deposits count |
| `lifetime_deposit_count_trx` | TRX deposits count |
| `lifetime_deposit_count_fun` | FUN deposits count |
| `lifetime_deposit_sum_total` | Total deposit sum (EUR) |
| `lifetime_deposit_sum_eur` | EUR deposits sum |
| `lifetime_deposit_sum_gbp` | GBP deposits sum |
| `lifetime_deposit_sum_trx` | TRX deposits sum (native) |
| `lifetime_deposit_sum_fun` | FUN deposits sum |

### 2.7 Deposits — By Period
| Period | Count Field | Sum Field |
|--------|-------------|-----------|
| Previous Day | `deposit_count_previous_day_*` | `deposit_sum_previous_day_*` |
| Last 7 Days | `deposit_count_last_7_*` | `deposit_sum_last_7_*` |
| Last 30 Days | `deposit_count_last_30_*` | `deposit_sum_last_30_*` |
| Last 90 Days | `deposit_count_last_90_*` | `deposit_sum_last_90_*` |

*Suffixes: `_total`, `_eur`, `_gbp`, `_trx`, `_fun`*

### 2.8 Cashouts — Lifetime
| Attribute | Description |
|-----------|-------------|
| `lifetime_cashout_count_total` | Total cashout count |
| `lifetime_cashout_count_eur` | EUR cashouts count |
| `lifetime_cashout_count_gbp` | GBP cashouts count |
| `lifetime_cashout_count_trx` | TRX cashouts count |
| `lifetime_cashout_sum_total` | Total cashout sum (EUR) |
| `lifetime_cashout_sum_eur` | EUR cashouts sum |
| `lifetime_cashout_sum_gbp` | GBP cashouts sum |
| `lifetime_cashout_sum_trx` | TRX cashouts sum (native) |

### 2.9 Cashouts — By Period
| Period | Count Field | Sum Field |
|--------|-------------|-----------|
| Previous Day | `cashout_count_previous_day_*` | `cashout_sum_previous_day_*` |
| Last 7 Days | `cashout_count_last_7_*` | `cashout_sum_last_7_*` |
| Last 30 Days | `cashout_count_last_30_*` | `cashout_sum_last_30_*` |
| Last 90 Days | `cashout_count_last_90_*` | `cashout_sum_last_90_*` |

*Suffixes: `_total`, `_eur`, `_gbp`, `_trx`*

### 2.10 Activity
| Attribute | Type | Description |
|-----------|------|-------------|
| `last_sum_deposit` | string | Last deposit amount (EUR) |
| `last_time_deposit` | timestamp | Last deposit timestamp |

---

## 3. Activity Types

### 3.1 Activity Summary
| Type | Description | Data Fields |
|------|-------------|-------------|
| `page` | Page view | url, referrer, utm_*, stag, width, height |
| `event` | Custom event | name, data (varies) |
| `attribute_change` | Attribute updated | {field: {from, to}} |
| `sent_email` | Email sent | delivery_id, template_id |
| `delivered_email` | Email delivered | inbox_provider, mx_host |
| `opened_email` | Email opened | timestamp |
| `clicked_email` | Email link clicked | href, delivery_id |
| `sent_action` | Push/In-App sent | template_id |
| `delivered_action` | Push delivered | |
| `opened_action` | Push opened | |
| `profile_segment_membership_change` | Segment change | entered[], exited[] |
| `anon_merge` | Anonymous profile merged | anonymous_id |

### 3.2 Custom Events
| Event Name | Data | Trigger |
|------------|------|---------|
| `player_balance` | `{"EUR": "20.04"}` | Balance change |
| `login_activity_status` | `{last_log_in: timestamp}` | Login |
| `login_failed` | - | Failed login attempt |

### 3.3 Page View Data
```json
{
  "url": "https://kaasino.com/en/games/categories/crash/",
  "referrer": "https://www.google.com/",
  "http_referrer": "https://casinovanger.com/",
  "stag": "246289_6946f2a49137f5fec3a01b05",
  "utm_source": "customer.io",
  "utm_medium": "email_action",
  "utm_campaign": "[PROMO]+Cheesy+Wheel",
  "tr_src": "seo",
  "tracking_link": "http://kaaslink.me/udnacjgbx",
  "width": "1280",
  "height": "681"
}
```

### 3.4 Screen Resolution Fields
| Field | Type | Internal Field | Description |
|:------|:-----|:---------------|:------------|
| `width` | string | `screen_width` | Ширина экрана в пикселях |
| `height` | string | `screen_height` | Высота экрана в пикселях |

> **Note:** Значения передаются как string, конвертируются в int при импорте.
> Источник: последняя `page` activity пользователя.

```python
# Extract screen resolution from last page activity
def get_screen_resolution(activities: list) -> tuple:
    for activity in activities:
        if activity.get('type') == 'page':
            data = activity.get('data', {})
            width = int(data.get('width', 0) or 0)
            height = int(data.get('height', 0) or 0)
            if width > 0 and height > 0:
                return width, height
    return None, None
```

---

## 4. Segments

### 4.1 System Segments (sys_*)
| ID | Name | Tag |
|----|------|-----|
| 10 | Restriction Group | sys_restrictions |
| 11 | SMS (Verified Phones) | SYSTEM |
| 14 | First Failed Deposit | SYSTEM |
| 16 | Restriction Group for IN-APPs | sys_restrictions |
| 17 | Email sender (campaigns) | - |
| 18 | DO NOT SEND EMAIL | sys_restrictions |

### 4.2 Deposit Count Segments
| ID | Name | Condition |
|----|------|-----------|
| 20 | DEP 1 | lifetime_deposit_count_total = 1 |
| 21 | DEP 2 | lifetime_deposit_count_total = 2 |
| 22 | DEP 3 | lifetime_deposit_count_total = 3 |
| 23 | DEP 4 | lifetime_deposit_count_total = 4 |
| 78 | DEP 5+ | lifetime_deposit_count_total > 4 |
| 25 | All Depositors | lifetime_deposit_count_total > 0 |
| 66 | RND | No deposits |

### 4.3 VIP Segments
| ID | Name | Condition |
|----|------|-----------|
| 42 | VIP 0 (Pre-VIP) | pre-vip tag OR thresholds |
| 64 | VIP ⭐️ | vip tag present |

**Pre-VIP Thresholds:**
- Last deposit sum > €250, OR
- Daily deposits > €350, OR
- Monthly deposits > €2,000, OR
- Quarterly deposits > €5,000

### 4.4 Retention Segments
| ID | Name |
|----|------|
| 36 | Birthday bonus 40 FS |
| 37 | Birthday bonus 60 FS |
| 76 | Churn 15-60 Days |
| 77 | Churn 60-360 Days |

---

## 5. Campaigns (Journeys)

### 5.1 System Campaigns (Transactional)
| ID | Name | Event |
|----|------|-------|
| 3 | loss_limit_disabled | user_limit_disabled |
| 4 | loss_limit_disable_confirmation | user_limit_confirmation |
| 5 | deposit_limit_updated | user_limit_updated |
| 6 | session_limit_updated | user_limit_updated |
| 29 | deposit_limit_created | user_limit_created |
| 30 | selfexclusion_limit_created | user_limit_created |
| 33 | address_confirmation_required | address_confirmation_required |
| 34 | user_verified | user_verified |
| 35 | unlock_instructions | unlock_instructions |
| 36 | lottery_reward | lottery_reward |
| 37 | Cashout_approved | cashout_approved |
| 38 | Deposit Canceled | deposit_canceled |
| 39 | document_not_approved | document_not_approved |
| 40 | reset_password_instructions | reset_password_instructions |
| 41 | bonuses_issued | bonuses_issued |
| 42 | cashout_canceled | cashout_canceled |
| 43 | freespin_bonus_issued | freespin_bonus_issued |
| 44 | Cashout_requested | cashout_requested |
| 45 | login_failed | login_failed |
| 46 | confirmation_instructions | confirmation_instructions |

### 5.2 Retention Campaigns
| ID | Name | Trigger | Status |
|----|------|---------|--------|
| 48 | Retention 0-1 | Segment 15 | Archived |
| 50 | Retention 1-2 | Segment DEP 1 | Stopped |
| 51 | Retention 2-3 | Segment DEP 2 | Running |
| 52 | Retention 3-4 | Segment DEP 3 | Running |

### 5.3 Action Types
| Type | Description |
|------|-------------|
| `email` | Email message |
| `22` | Push / In-App notification |
| `webhook` | Webhook (bonus issue, etc.) |

---

## 6. Data for Enrichment (from Activities)

### 6.1 Attribution
| Field | Source |
|-------|--------|
| `stag` | attributes / page.stag |
| `utm_source` | page.utm_source |
| `utm_medium` | page.utm_medium |
| `utm_campaign` | page.utm_campaign |
| `tr_src` | page.tr_src |
| `http_referrer` | page.http_referrer |
| `referrer` | page.referrer |

### 6.2 Behavior (Calculated)
| Metric | Source |
|--------|--------|
| `first_referrer` | First external page.referrer |
| `last_referrer` | Most recent external page.referrer |
| `favorite_language` | Most visited /xx/ path |
| `favorite_category` | Most visited /games/categories/* |
| `pages_visited` | page count |

### 6.3 Engagement (Calculated)
| Metric | Calculation |
|--------|-------------|
| `email_sent` | count(sent_email) |
| `email_delivered` | count(delivered_email) |
| `email_opened` | count(opened_email) |
| `email_clicked` | count(clicked_email) |
| `email_open_rate` | opened / sent |
| `email_click_rate` | clicked / sent |
| `push_sent` | count(sent_action) |
| `push_opened` | count(opened_action) |
| `push_engaged` | opened_action > 0 |

### 6.4 Journey (Calculated)
| Metric | Source |
|--------|--------|
| `segments_entered` | segment_change.entered[] |
| `segments_exited` | segment_change.exited[] |

---

## 7. API Usage

### 7.1 Get Customer
```bash
curl -s "https://api-eu.customer.io/v1/api/customers/kaasino:10/attributes" \
  -H "Authorization: Bearer {APP_API_KEY}"
```

### 7.2 Get Activities
```bash
curl -s "https://api-eu.customer.io/v1/api/customers/kaasino:10/activities?limit=100" \
  -H "Authorization: Bearer {APP_API_KEY}"
```

### 7.3 Get Segments
```bash
curl -s "https://api-eu.customer.io/v1/api/segments" \
  -H "Authorization: Bearer {APP_API_KEY}"
```

### 7.4 Get Campaigns
```bash
curl -s "https://api-eu.customer.io/v1/api/campaigns" \
  -H "Authorization: Bearer {APP_API_KEY}"
```

---

## 8. Groups Reference

| Group ID | Description |
|----------|-------------|
| 00002 | Active players |
| 00011 | Test users |
| 00012 | Regulators |
| 00013 | Wrong email |
| 00025 | Restriction |
| 00026 | Restriction |
| 00039 | First failed deposit |
| 00043 | Verified phones |
| 00076-00081 | Churn cohorts |
| 00107 | Birthday 40 FS eligible |
| 00108 | Birthday 60 FS eligible |
| 00111 | Marketing restriction |
| 00179 | In-App restriction |

*Full mapping in `Kaas_GROUPS.md`*

---

## 9. Tags Reference

| Tag | Description |
|-----|-------------|
| `pre-vip` | Pre-VIP candidate |
| `vip` | All VIP players (base VIP + all Metal: Copper → Gold) |
| `COPPER ⭐️` | Copper VIP |
| `BRONZE ⭐️` | Bronze VIP |
| `SILVER ⭐️` | Silver VIP |
| `GOLD ⭐️` | Gold VIP |
| `ABSOLUTE ⭐️` | Absolute VIP (Gold + Absolute) |
| `vip_YY.MM` | VIP assigned date (e.g., `vip_25.03`) |
| `vip_helen` | Assigned to Helen |
| `vip_julia` | Assigned to Julia |
| `vip_*_EX` | Ex-VIP (downgraded) |
| `vip_*_react` | VIP reactivation |
| `BH` | Bonus Hunter |
| `BA` | Bonus Abuser |
| `ABUSER` | Confirmed abuser |
| `BH_50%` | Bonus Hunter 50% threshold |
| `BH_70%` | Bonus Hunter 70% threshold |
| `bonus_hunter` | Legacy bonus hunter tag |
| `bonus_RND` | Bonus for RND players |
| `No_Bonus` | No bonus allowed |
| `SE` | Self Exclusion |
| `SE_3` | Self-excluded 3 months |
| `SE_6` | Self-excluded 6 months |
| `SE_12` | Self-excluded 12 months |
| `verified` | KYC verified |
| `selfie+` | Selfie verified |
| `tel_verified` | Phone verified |
| `trust` | PSP Trusted level > 3 |
| `asked for docs` | Documents requested |
| `asked for selfie` | Selfie requested |
| `AT` | Austria |
| `BE` | Belgium |
| `DE` | Germany |
| `ES` | Spain |
| `FR` | France |
| `UK` | United Kingdom |
| `AF lock` | Anti-fraud locked |
| `AF_double` | Double account detected |
| `AF_monitor` | Under monitoring |
| `AF_transfer` | Suspicious transfer |
| `reg_by_fraud` | Registered by fraud |
| `chargeback` | Chargeback filed |
| `underage` | Underage player |
| `SUICIDE THREAT` | Suicide threat reported |
| `closed_double` | Closed - duplicate account |
| `closed_PG` | Closed - problem gambling |
| `closed_PR` | Closed - per request |
| `reopened` | Account reopened |
| `balance corrected` | Balance was corrected |
| `deps_limit` | Deposit limit set |
| `PWA+` | PWA installed |
| `BIG_WIN` | Big win recorded |
| `ftd_YY.MM` | First deposit date (e.g., `ftd_25.03`) |
| `🚹` | Male |
| `🚺` | Female |
| `⚧️` | Other gender |

---

## 10. Timestamps

All timestamps are **Unix timestamps** (seconds since epoch).

```python
from datetime import datetime
dt = datetime.fromtimestamp(1766624634)  # 2025-12-25 01:23:54
```

Each attribute has a corresponding timestamp in `timestamps` object.

---

## 11. Limitations

| Limit | Value |
|-------|-------|
| Activity history | ~90 days |
| API rate limit | 100 req/sec |
| Batch size | 1000 customers |
| Attribute value size | 65KB |

---

*Generated: 2025-12-25*
