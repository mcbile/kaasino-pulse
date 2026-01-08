# iGaming Analytics — Fundamental Axioms

> **Version:** 1.2.1 | **Date:** 2025-12-27
> **Scope:** Brand-agnostic principles for iGaming data analysis
> **Author:** Insight-AI

---

## 1. Bonus Logic (Жизненный цикл бонусов)

### 1.1 Bonus States

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BONUS LIFECYCLE                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ISSUED ─────────────────────────────────────────────────────────────────► │
│      │                                                                      │
│      ▼                                                                      │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │                         PENDING                                      │  │
│   │   Бонус выдан, ожидает выполнения условия:                           │  │
│   │   • Активация игроком                                                │  │
│   │   • Временное условие (напр. часть 2 FS на следующий день)           │  │
│   │   • Выполнение триггера (депозит, ставка, и т.д.)                    │  │
│   └───────────────────────────┬──────────────────────────────────────────┘  │
│                               │                                             │
│              ┌────────────────┼────────────────┐                            │
│              ▼                ▼                ▼                            │
│      ┌───────────┐    ┌───────────┐    ┌───────────┐                        │
│      │  ACTIVE   │    │  EXPIRED  │    │ CANCELED  │                        │
│      │           │    │           │    │           │                        │
│      │ Условие   │    │ Не успел  │    │ Отменён   │                        │
│      │ выполнено,│    │ выполнить │    │ оператором│                        │
│      │ бонус     │    │ условие   │    │ или       │                        │
│      │ активен   │    │ в срок    │    │ системой  │                        │
│      └─────┬─────┘    └───────────┘    └───────────┘                        │
│            │                                                                │
│            ▼                                                                │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │                     WAGERING IN PROGRESS                             │  │
│   │   Игрок отыгрывает вейджер (например, x35)                           │  │
│   │   bet_sum должен достичь bonus × wager_requirement                   │  │
│   └───────────────────────────┬──────────────────────────────────────────┘  │
│                               │                                             │
│              ┌────────────────┼────────────────┬────────────────┐           │
│              ▼                ▼                ▼                ▼           │
│      ┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐       │
│      │WAGER_DONE │    │   LOST    │    │  EXPIRED  │    │ CANCELED  │       │
│      │           │    │           │    │           │    │           │       │
│      │ Успешно   │    │ Проиграл  │    │ Не успел  │    │ Отменён   │       │
│      │ отыграл   │    │ баланс    │    │ отыграть  │    │ во время  │       │
│      │ вейджер   │    │ до 0      │    │ в срок    │    │ отыгрыша  │       │
│      └───────────┘    └───────────┘    └───────────┘    └───────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Bonus Metrics — Definitions

| Field | Formula | Description |
|:------|:--------|:------------|
| `bonus_pending` | — | Бонусы ожидающие условия (активация, триггер, время) |
| `bonus_active` | — | Активные бонусы (в процессе отыгрыша) |
| `bonus_wager_done` | — | Успешно отыгранные бонусы |
| `bonus_lost` | — | Проигранные бонусы (баланс = 0 во время отыгрыша) |
| `bonus_expired` | — | Истёкшие бонусы (не выполнено условие или не отыграны в срок) |
| `bonus_canceled` | — | Отменённые бонусы (на любом этапе: pending или active) |

### 1.2.1 Cancel Job Logic

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CANCEL JOB PROCESSING                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CANCELED может применяться к бонусу на ЛЮБОМ этапе:                        │
│                                                                             │
│  1. PENDING → CANCELED                                                      │
│     • Весь бонус идёт в bonus_canceled                                      │
│     • bonus_used НЕ затрагивается                                           │
│                                                                             │
│  2. ACTIVE → CANCELED (частичный отыгрыш)                                   │
│     • Уже использованная часть → bonus_lost                                 │
│     • Остаток (неиспользованный) → bonus_canceled                           │
│                                                                             │
│     Пример:                                                                 │
│     ┌─────────────────────────────────────────────────────────────────────┐ │
│     │  Бонус: €100, отыграно 40%, cancel job запущен                     │ │
│     │  ───────────────────────────────────────────────────────────────── │ │
│     │  bonus_lost += €40      (использованная часть)                     │ │
│     │  bonus_canceled += €60  (неиспользованный остаток)                 │ │
│     │  bonus_active -= €100   (бонус больше не активен)                  │ │
│     │                                                                     │ │
│     │  → bonus_used = wager_done + lost + active                         │ │
│     │  → €40 попадает в bonus_used через bonus_lost                      │ │
│     └─────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  АНАЛОГИЧНО работает EXPIRED:                                               │
│  • Использованная часть → bonus_lost                                        │
│  • Неиспользованный остаток → bonus_expired                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Aggregated Bonus Metrics

```python
# TOTAL — все бонусы когда-либо выданные
bonus_total = (bonus_pending + bonus_active + bonus_wager_done +
               bonus_lost + bonus_expired + bonus_canceled)

# USED — реально использованные игроком (влияют на GGR)
bonus_used = bonus_wager_done + bonus_lost + bonus_active

# EFFECTIVE — только те, что дошли до конца
bonus_effective = bonus_wager_done
```

### 1.4 Why `bonus_used` matters

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ВАЖНО: Для расчёта NGR используем bonus_used, НЕ bonus_total              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Пример:                                                                    │
│  • Игроку выдали бонус €100 (bonus_total += 100)                           │
│  • Бонус истёк неактивированным (bonus_expired += 100)                     │
│  • bonus_used = 0 (игрок не использовал деньги казино)                     │
│                                                                             │
│  NGR = GGR - bonus_used (не bonus_total!)                                  │
│                                                                             │
│  Если использовать bonus_total:                                            │
│  ❌ NGR занижен, т.к. вычитаем бонусы которые игрок не использовал         │
│                                                                             │
│  Если использовать bonus_used:                                             │
│  ✅ NGR корректен, т.к. вычитаем только реально потраченные бонусы         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Multi-Currency Handling (Мультивалютность)

### 2.1 Core Principle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    GOLDEN RULE: STORE IN ORIGINAL, DISPLAY IN EUR           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. ХРАНЕНИЕ: Все транзакции хранятся в оригинальной валюте                │
│     • deposit: 1000 USD                                                    │
│     • deposit: 0.05 BTC                                                    │
│     • deposit: 500 EUR                                                     │
│                                                                             │
│  2. КОНВЕРТАЦИЯ: При каждой транзакции фиксируется курс на момент операции │
│     • 1000 USD @ 0.92 = 920 EUR                                            │
│     • 0.05 BTC @ 42000 = 2100 EUR                                          │
│     • 500 EUR @ 1.00 = 500 EUR                                             │
│                                                                             │
│  3. АГРЕГАЦИЯ: Все суммы агрегируются в EUR                                │
│     • dep_sum = 920 + 2100 + 500 = 3520 EUR                                │
│                                                                             │
│  4. ОТОБРАЖЕНИЕ: Показываем в EUR с указанием исходных валют               │
│     • "€3,520 (USD, BTC, EUR)"                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Currency Fields Schema

| Field | Type | Description |
|:------|:-----|:------------|
| `currency` | string | Primary currency (most used) |
| `currency_2` | string | Secondary currency (if used) |
| `currency_3` | string | Tertiary currency (if used) |
| `currencies_used` | array | List of all currencies ever used |
| `is_multi_currency` | bool | Player uses 2+ currencies |

### 2.3 Conversion Logic

```python
def convert_to_eur(amount: float, currency: str, tx_date: datetime) -> float:
    """
    Convert amount to EUR using historical rate at transaction time.

    IMPORTANT: Always use the rate at the moment of transaction,
    not current rate. This ensures financial accuracy.
    """
    if currency == 'EUR':
        return amount

    # Get historical rate for the transaction date
    rate = get_historical_rate(currency, 'EUR', tx_date)

    return amount * rate


def aggregate_deposits(transactions: list) -> dict:
    """
    Aggregate deposits across all currencies into EUR.
    Track which currencies were used.
    """
    total_eur = 0.0
    currencies = set()

    for tx in transactions:
        eur_amount = convert_to_eur(tx.amount, tx.currency, tx.created_at)
        total_eur += eur_amount
        currencies.add(tx.currency)

    return {
        'dep_sum': total_eur,           # Aggregated in EUR
        'currencies_used': list(currencies),
        'is_multi_currency': len(currencies) > 1
    }
```

### 2.4 Display Format

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  DISPLAY RULES                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Single currency:                                                           │
│  • dep_sum: €5,420                                                         │
│                                                                             │
│  Multi-currency:                                                            │
│  • dep_sum: €5,420 (EUR, USD)                                              │
│  • Tooltip: "Converted from EUR €3,000 + USD $2,640"                       │
│                                                                             │
│  With crypto:                                                               │
│  • dep_sum: €12,350 (EUR, BTC, ETH)                                        │
│  • Tooltip: "EUR €5,000 + BTC ₿0.15 + ETH Ξ2.5"                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Cryptocurrency Precision (Криптовалюты)

### 3.1 Decimal Places by Currency

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CRYPTOCURRENCY DECIMALS                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Currency    │ Decimals │ Smallest Unit    │ Example                        │
│  ────────────┼──────────┼──────────────────┼─────────────────────────────── │
│  BTC         │    8     │ 1 satoshi        │ 0.00000001 BTC                 │
│  ETH         │   18     │ 1 wei            │ 0.000000000000000001 ETH       │
│  LTC         │    8     │ 1 litoshi        │ 0.00000001 LTC                 │
│  USDT (ERC)  │    6     │ 0.000001 USDT    │ 0.000001 USDT                  │
│  USDC        │    6     │ 0.000001 USDC    │ 0.000001 USDC                  │
│  XRP         │    6     │ 1 drop           │ 0.000001 XRP                   │
│  DOGE        │    8     │ 1 koinu          │ 0.00000001 DOGE                │
│  TRX         │    6     │ 1 sun            │ 0.000001 TRX                   │
│  SOL         │    9     │ 1 lamport        │ 0.000000001 SOL                │
│  BNB         │   18     │ 1 jager          │ 0.000000000000000001 BNB       │
│                                                                             │
│  FIAT (reference):                                                          │
│  EUR/USD     │    2     │ 1 cent           │ 0.01 EUR                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Storage Rules

```python
# STORAGE: Always store full precision
CRYPTO_DECIMALS = {
    'BTC': 8,
    'ETH': 18,
    'LTC': 8,
    'USDT': 6,
    'USDC': 6,
    'XRP': 6,
    'DOGE': 8,
    'TRX': 6,
    'SOL': 9,
    'BNB': 18,
    # FIAT
    'EUR': 2,
    'USD': 2,
    'GBP': 2,
}

def store_amount(amount: float, currency: str) -> Decimal:
    """
    Store amount with full precision for the currency.
    Use Decimal to avoid floating point errors.
    """
    decimals = CRYPTO_DECIMALS.get(currency, 8)
    return Decimal(str(amount)).quantize(Decimal(10) ** -decimals)


def display_amount(amount: Decimal, currency: str) -> str:
    """
    Display amount with appropriate precision.
    For display, we often use fewer decimals than storage.
    """
    if currency in ['BTC', 'ETH', 'LTC']:
        # Show up to 8 decimals, trim trailing zeros
        return f"{float(amount):.8f}".rstrip('0').rstrip('.')
    elif currency in ['USDT', 'USDC']:
        # Stablecoins: show 2 decimals like fiat
        return f"{float(amount):.2f}"
    else:
        return f"{float(amount):.8f}".rstrip('0').rstrip('.')
```

### 3.3 Common Pitfalls

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ⚠️  CRYPTO PRECISION PITFALLS                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ❌ WRONG: Using float for crypto amounts                                  │
│     float(0.1 + 0.2) = 0.30000000000000004                                 │
│                                                                             │
│  ✅ CORRECT: Using Decimal                                                 │
│     Decimal('0.1') + Decimal('0.2') = Decimal('0.3')                       │
│                                                                             │
│  ────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ❌ WRONG: Rounding BTC to 2 decimals                                      │
│     0.00005 BTC → 0.00 BTC (lost $2!)                                      │
│                                                                             │
│  ✅ CORRECT: Keep full 8 decimal precision                                 │
│     0.00005 BTC → 0.00005000 BTC                                           │
│                                                                             │
│  ────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ❌ WRONG: Converting to EUR then back to crypto                           │
│     0.001 BTC → €42 → 0.00099 BTC (rounding loss)                          │
│                                                                             │
│  ✅ CORRECT: Store original, convert only for display                      │
│     0.001 BTC stored, shown as "€42 (0.001 BTC)"                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. PSP Trust Level (Уровень доверия PSP)

### 4.1 What is PSP Trust Level?

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PSP TRUST LEVEL EXPLAINED                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PSP = Payment Service Provider (платёжный провайдер)                       │
│                                                                             │
│  PSP Trust Level — это оценка надёжности игрока на основе его истории      │
│  платежей ACROSS ALL BRANDS на платформе (не только на вашем бренде).      │
│                                                                             │
│  Пример платформы с 1500+ брендами:                                        │
│  • Игрок делал депозиты на Brand_A, Brand_B, Brand_C                       │
│  • PSP агрегирует историю всех его платежей                                │
│  • Brand_D получает trust level даже для "нового" игрока                   │
│                                                                             │
│  ЭТО КРОСС-БРЕНДОВАЯ МЕТРИКА!                                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Trust Levels Hierarchy

| Level | Code | Criteria | Risk | Description |
|:------|:-----|:---------|:----:|:------------|
| **Verified** | `trusted_verified` | Had successful cashout (passed KYC) | LOW | Highest trust — completed withdrawal |
| **Level 4** | `trusted_lvl_4` | €500+ total deposits across platform | LOW | High volume depositor |
| **Level 3** | `trusted_lvl_3` | €300+ total deposits | LOW-MED | Medium-high depositor |
| **Level 2** | `trusted_lvl_2` | €200+ total deposits | MEDIUM | Medium depositor |
| **Level 1** | `trusted_lvl_1` | €100+ OR 2+ deposits | MEDIUM | Entry-level trust |
| **Untrusted** | `untrusted` | No deposit history | HIGH | Unknown player |
| **Untrusted** | `untrusted_from_affiliates` | Came from affiliate, no history | HIGH | Affiliate traffic, no history |

### 4.3 Trust Level Flow

```
                    NEW PLAYER
                         │
                         ▼
            ┌────────────────────────┐
            │     UNTRUSTED          │
            │   No platform history  │
            └───────────┬────────────┘
                        │
                        │ First deposit €100+
                        │ OR 2+ deposits
                        ▼
            ┌────────────────────────┐
            │   TRUSTED_LVL_1        │
            │   €100+ or 2+ deps     │
            └───────────┬────────────┘
                        │
                        │ Total deps reach €200+
                        ▼
            ┌────────────────────────┐
            │   TRUSTED_LVL_2        │
            │   €200+ deposits       │
            └───────────┬────────────┘
                        │
                        │ Total deps reach €300+
                        ▼
            ┌────────────────────────┐
            │   TRUSTED_LVL_3        │
            │   €300+ deposits       │
            └───────────┬────────────┘
                        │
                        │ Total deps reach €500+
                        ▼
            ┌────────────────────────┐
            │   TRUSTED_LVL_4        │
            │   €500+ deposits       │
            └───────────┬────────────┘
                        │
                        │ Successful cashout
                        │ (KYC verified)
                        ▼
            ┌────────────────────────┐
            │  TRUSTED_VERIFIED      │
            │  Completed withdrawal  │
            └────────────────────────┘
```

### 4.4 Usage in Scoring

```python
# PSP Trust Level используется для:
# 1. M-Score modifier для NEWBEE (новичков)
# 2. Risk assessment при выдаче бонусов
# 3. Лимиты на депозиты/выводы

PSP_MODIFIERS = {
    'trusted_verified': 1.10,          # +10% к M-Score
    'trusted_lvl_4': 1.09,             # +9%
    'trusted_lvl_3': 1.06,             # +6%
    'trusted_lvl_2': 1.03,             # +3%
    'trusted_lvl_1': 1.00,             # baseline
    'untrusted': 0.90,                 # -10% penalty
    'untrusted_from_affiliates': 0.90  # -10% penalty
}

# ВАЖНО: PSP Trust Level ≠ KYC Status
# PSP — кросс-брендовая метрика от платёжного провайдера
# KYC — верификация документов на конкретном бренде
```

---

## 5. Financial Formulas (Финансовые формулы)

### 5.1 Core Financial Metrics

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FINANCIAL METRICS HIERARCHY                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  RAW DATA (from transactions):                                              │
│  ─────────────────────────────                                              │
│  • dep_sum      — Total deposits (all time)                                │
│  • wd_sum       — Total withdrawals (all time)                             │
│  • bet_sum      — Total bets placed                                        │
│  • win_sum      — Total wins received                                      │
│  • bonus_used   — Bonuses actually used by player                          │
│  • balance      — Current account balance                                  │
│  • wd_pending   — Pending withdrawal amount                                │
│                                                                             │
│  CORRECTIONS (adjustments):                                                 │
│  ──────────────────────────                                                 │
│  • addition     — Manual credits (goodwill, compensation)                  │
│  • subtraction  — Manual debits (corrections)                              │
│  • chargeback   — Disputed transactions reversed                           │
│  • refund       — Returned funds                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Calculated Metrics — Formulas

#### IN_OUT (Net Cash Flow)

```python
in_out = dep_sum - wd_sum
```

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  IN_OUT — "Кто выигрывает: казино или игрок?"                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  in_out > 0  →  Казино в плюсе (игрок внёс больше, чем вывел)              │
│  in_out < 0  →  Игрок в плюсе (вывел больше, чем внёс) — SHARK!            │
│  in_out = 0  →  Break-even                                                 │
│                                                                             │
│  Пример:                                                                    │
│  • dep_sum = €10,000                                                       │
│  • wd_sum = €7,000                                                         │
│  • in_out = €10,000 - €7,000 = +€3,000 (казино в плюсе)                    │
│                                                                             │
│  Shark пример:                                                              │
│  • dep_sum = €5,000                                                        │
│  • wd_sum = €8,000                                                         │
│  • in_out = €5,000 - €8,000 = -€3,000 (игрок забрал €3k у казино!)         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### GGR (Gross Gaming Revenue)

```python
ggr = bet_sum - win_sum
```

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  GGR — "Сколько казино заработало на ставках?"                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  GGR = Все ставки игрока - Все выигрыши игрока                             │
│                                                                             │
│  ggr > 0  →  Казино выиграло на ставках                                    │
│  ggr < 0  →  Игрок выиграл на ставках (winning player)                     │
│                                                                             │
│  ВАЖНО: GGR ≠ in_out                                                       │
│  • GGR учитывает только игровую активность (ставки vs выигрыши)            │
│  • in_out учитывает денежные потоки (депозиты vs выводы)                   │
│                                                                             │
│  Пример расхождения:                                                        │
│  • Игрок внёс €1000, поставил €5000, выиграл €4500                         │
│  • GGR = €5000 - €4500 = +€500 (казино в плюсе по игре)                    │
│  • Но игрок ещё не вывел — in_out = €1000 - €0 = +€1000                   │
│  • После вывода €800: in_out = €1000 - €800 = +€200                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### NGR (Net Gaming Revenue) — Simplified

```python
ngr = ggr - bonus_total
```

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  NGR (Simplified) — "GGR минус все бонусы"                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ⚠️ ВНИМАНИЕ: Это упрощённая формула!                                      │
│                                                                             │
│  Использует bonus_total (все выданные бонусы), а не bonus_used.            │
│  Может занижать реальную прибыль, т.к. вычитает неиспользованные бонусы.   │
│                                                                             │
│  Используется когда:                                                        │
│  • Нет разбивки бонусов по статусам                                        │
│  • Нужна консервативная оценка                                             │
│  • Legacy системы без детальной аналитики                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### REAL_NGR (Real Net Gaming Revenue) — Accurate

```python
real_ngr = ggr - bonus_used - correction - (chargeback + refund)
```

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  REAL_NGR — "Реальная чистая прибыль казино"                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Формула:                                                                   │
│  real_ngr = ggr                                                            │
│           - bonus_used        (только использованные бонусы)               │
│           - correction        (ручные корректировки: addition - subtraction)│
│           - chargeback        (возвраты по диспутам)                       │
│           - refund            (возвраты средств)                           │
│                                                                             │
│  ЭТО САМАЯ ТОЧНАЯ МЕТРИКА ПРИБЫЛЬНОСТИ!                                    │
│                                                                             │
│  Пример:                                                                    │
│  • GGR = €5,000                                                            │
│  • bonus_used = €800 (игрок использовал бонусы)                            │
│  • correction = €100 (goodwill кредиты)                                    │
│  • chargeback = €200 (диспуты)                                             │
│  • refund = €50                                                            │
│  • real_ngr = €5000 - €800 - €100 - €200 - €50 = €3,850                   │
│                                                                             │
│  Почему bonus_used, а не bonus_total:                                       │
│  • bonus_total = €2000 (все выданные)                                      │
│  • bonus_used = €800 (реально использованные)                              │
│  • Разница €1200 — бонусы истекли/отменены, не влияют на прибыль           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### SPEND (Player's Real Spending)

```python
spend = in_out - balance - wd_pending
```

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SPEND — "Сколько денег игрок РЕАЛЬНО потратил?"                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Формула:                                                                   │
│  spend = in_out              (чистый денежный поток)                       │
│        - balance             (текущий баланс — ещё не потрачен)            │
│        - wd_pending          (pending выводы — уже "не его")               │
│                                                                             │
│  Логика:                                                                    │
│  • in_out показывает сколько денег "осталось в казино"                     │
│  • Но часть из них на балансе игрока (balance)                             │
│  • И часть в очереди на вывод (wd_pending)                                 │
│  • spend = то, что игрок ПОТРАТИЛ И НЕ ВЕРНЁТ                              │
│                                                                             │
│  Пример:                                                                    │
│  • dep_sum = €10,000                                                       │
│  • wd_sum = €6,000                                                         │
│  • in_out = €4,000                                                         │
│  • balance = €500 (на счету)                                               │
│  • wd_pending = €1,000 (запросил вывод)                                    │
│  • spend = €4000 - €500 - €1000 = €2,500                                  │
│                                                                             │
│  Интерпретация:                                                             │
│  • €2,500 — деньги которые игрок проиграл и не вернёт                      │
│  • €500 — ещё на балансе, может вывести                                    │
│  • €1,000 — уже в процессе вывода                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Formula Relationships

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    METRIC RELATIONSHIPS                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PLAYER VIEW (what player sees):                                            │
│  ────────────────────────────────                                           │
│                                                                             │
│    dep_sum ─────────────┬──────────────────────────────────────────────►   │
│                         │                                                   │
│                         ▼                                                   │
│    ┌─────────────────────────────────────────────────────────────────┐     │
│    │                    PLAYER'S MONEY                                │     │
│    │                                                                  │     │
│    │   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │     │
│    │   │ balance  │  │wd_pending│  │  spend   │  │  wd_sum  │       │     │
│    │   │ (active) │  │ (queued) │  │ (lost)   │  │ (taken)  │       │     │
│    │   └──────────┘  └──────────┘  └──────────┘  └──────────┘       │     │
│    │                                                                  │     │
│    └─────────────────────────────────────────────────────────────────┘     │
│                                                                             │
│  CASINO VIEW (what casino sees):                                            │
│  ────────────────────────────────                                           │
│                                                                             │
│    bet_sum ─────────────┬──────────────────────────────────────────────►   │
│                         │                                                   │
│                         ▼                                                   │
│    ┌─────────────────────────────────────────────────────────────────┐     │
│    │                    CASINO'S REVENUE                              │     │
│    │                                                                  │     │
│    │   win_sum ──► │ GGR │ ──► │ NGR │ ──► │ real_ngr │              │     │
│    │               │     │     │     │     │          │              │     │
│    │               │     │     │-bonus│     │-corrections│            │     │
│    │               └─────┘     └─────┘     └──────────┘              │     │
│    │                                                                  │     │
│    └─────────────────────────────────────────────────────────────────┘     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.4 Ratio Metrics

| Metric | Formula | Description | Risk Thresholds |
|:-------|:--------|:------------|:----------------|
| `wd_dep_rate` | `(wd_sum / dep_sum) × 100` | % выводов от депозитов | 🟢 <30%, 🟡 <45%, 🟠 <60%, 🟠 <75%, 🔴 ≥100% |
| `bonus_dep_rate` | `(bonus_used / dep_sum) × 100` | % бонусов от депозитов | 🟢 <15%, 🟡 15-25%, 🟠 25-50%, 🟠 50-70%, 🔴 >70% |
| `bonus_ggr_rate` | `(bonus_used / ggr) × 100` | % бонусов от GGR | 🟢 <20%, 🟡 20-30%, 🟠 30-60%, 🟠 60-75%, 🔴 >75% |
| `rtp` | `(win_sum / bet_sum) × 100` | Return to Player % | 🟢 <95.5%, 🟢 95.5-97%, 🟡 97-98.5%, 🟠 98.5-100%, 🔴 >100% |
| `bet_dep_rate` | `bet_sum / dep_sum` | Turnover multiplier | Higher = more engagement |

---

## 6. Temporal Metrics (Временные метрики)

### 6.1 Recency Metrics

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    RECENCY = DAYS SINCE EVENT                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  All recency metrics are CURRENCY-AGNOSTIC!                                 │
│  They measure TIME, not amounts.                                            │
│                                                                             │
│  Metric          │ Formula                    │ Description                 │
│  ────────────────┼────────────────────────────┼─────────────────────────── │
│  dep_recency     │ NOW() - last_dep_dt        │ Days since last deposit    │
│  bet_recency     │ NOW() - last_bet_dt        │ Days since last bet        │
│  wd_recency      │ NOW() - last_wd_dt         │ Days since last withdrawal │
│  login_recency   │ NOW() - last_login_dt      │ Days since last login      │
│  reg_recency     │ NOW() - reg_dt             │ Days since registration    │
│  ftd_recency     │ NOW() - ftd_dt             │ Days since first deposit   │
│  bonus_recency   │ NOW() - last_bonus_dt      │ Days since last bonus      │
│                                                                             │
│  ВАЖНО: Эти метрики НЕ ЗАВИСЯТ от валюты!                                  │
│  • Депозит в BTC или EUR — дата одинаково важна                            │
│  • R-Score (Recency) рассчитывается по времени, не по сумме                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Period Aggregations

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PERIOD AGGREGATIONS                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Standard periods:                                                          │
│  • 1d  — Previous day (yesterday)                                          │
│  • 3d — Last 3 days (rolling month)                                      │
│  • 7d  — Last 7 days (rolling week)                                        │
│  • 14d — Last 14 days (rolling month)                                      │
│  • 30d — Last 30 days (rolling month)                                      │
│  • 90d — Last 90 days (rolling quarter)                                    │
│                                                                             │
│  Examples:                                                                  │
│  ────────────────────────────────────────────────────────────────────────  │
│  dep_sum_7d   = SUM(deposits WHERE date >= NOW() - 7 days)                 │
│  dep_cnt_30d  = COUNT(deposits WHERE date >= NOW() - 30 days)              │
│  bet_sum_90d  = SUM(bets WHERE date >= NOW() - 90 days)                    │
│                                                                             │
│  CURRENCY HANDLING:                                                         │
│  ────────────────────────────────────────────────────────────────────────  │
│  All period sums are converted to EUR at transaction time.                  │
│  • dep_sum_7d in EUR (converted from any currency at tx time)              │
│  • This ensures consistent comparison across time                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.3 Velocity Calculation

```python
# Velocity = acceleration/deceleration of activity
velocity = (dep_sum_7d * 4) / dep_sum_30d

# Interpretation:
# velocity > 1.5  →  ACCELERATING (last week = 150%+ of monthly average)
# velocity 1.0-1.5 →  STABLE (last week = 100-150% of average)
# velocity 0.5-1.0 →  SLOWING (last week = 50-100% of average)
# velocity < 0.5  →  DECLINING (last week < 50% of average)
# velocity = 0    →  STOPPED (no activity last week)
```

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  VELOCITY FORMULA EXPLAINED                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  velocity = (dep_sum_7d × 4) / dep_sum_30d                                 │
│                                                                             │
│  Why × 4?                                                                   │
│  • 30 days ÷ 7 days ≈ 4.3 weeks                                            │
│  • We multiply 7d by 4 to normalize to monthly scale                       │
│  • This makes velocity = 1.0 when weekly activity = monthly average        │
│                                                                             │
│  Example:                                                                   │
│  • dep_sum_7d = €500                                                       │
│  • dep_sum_30d = €2000                                                     │
│  • velocity = (€500 × 4) / €2000 = €2000 / €2000 = 1.0                    │
│  • Interpretation: STABLE (this week = average week)                       │
│                                                                             │
│  Another example:                                                           │
│  • dep_sum_7d = €800                                                       │
│  • dep_sum_30d = €2000                                                     │
│  • velocity = (€800 × 4) / €2000 = €3200 / €2000 = 1.6                    │
│  • Interpretation: ACCELERATING (this week = 160% of average)              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Tag Parsing (Парсинг тегов)

### 7.1 Status Detection (active/closed)

```python
def detect_status(player: dict) -> str:
    """
    Determine player account status from tags and disabled field.

    Priority: disabled field > tags > default
    """
    # Check disabled field first (from CIO/backend)
    disabled = player.get('disabled', 'none')
    if disabled and disabled != 'none':
        return 'closed'

    # Check for locked_at timestamp (PostgreSQL)
    if player.get('locked_at'):
        return 'closed'

    # Check tags for closure indicators
    tags = player.get('tags', [])
    if isinstance(tags, str):
        tags = [t.strip().lower() for t in tags.split(',')]
    else:
        tags = [t.lower() for t in tags]

    CLOSED_TAGS = [
        'closed', 'disabled', 'blocked', 'banned',
        'self-exclusion', 'self_exclusion', 'selfexclusion',
        'gamstop', 'cruks', 'oasis',  # Regulatory exclusions
        'fraud', 'aml', 'kyc_failed',
        'dormant', 'inactive_closed'
    ]

    for tag in tags:
        if tag in CLOSED_TAGS:
            return 'closed'

    return 'active'
```

### 7.2 Closed Reason Detection

```python
def detect_closed_reason(player: dict) -> str:
    """
    Determine WHY an account was closed from tags.

    Returns standardized reason code.
    """
    tags = player.get('tags', [])
    if isinstance(tags, str):
        tags = [t.strip().lower() for t in tags.split(',')]
    else:
        tags = [t.lower() for t in tags]

    # Priority order: regulatory > fraud > self > operator > inactive

    # 1. Regulatory exclusions (highest priority)
    REGULATORY_TAGS = {
        'gamstop': 'GAMSTOP',           # UK self-exclusion
        'cruks': 'CRUKS',               # NL self-exclusion
        'oasis': 'OASIS',               # DE self-exclusion
        'rofus': 'ROFUS',               # DK self-exclusion
        'spelpaus': 'SPELPAUS',         # SE self-exclusion
    }
    for tag, reason in REGULATORY_TAGS.items():
        if tag in tags:
            return reason

    # 2. Fraud/AML (second priority)
    FRAUD_TAGS = ['fraud', 'aml', 'money_laundering', 'suspicious',
                  'multi_account', 'bonus_abuse', 'chargeback_fraud']
    for tag in FRAUD_TAGS:
        if tag in tags:
            return 'FRAUD'

    # 3. KYC failure
    KYC_FAIL_TAGS = ['kyc_failed', 'kyc_rejected', 'verification_failed',
                     'document_rejected', 'unverifiable']
    for tag in KYC_FAIL_TAGS:
        if tag in tags:
            return 'KYC_FAILED'

    # 4. Self-exclusion (player requested)
    SELF_EXCLUSION_TAGS = ['self-exclusion', 'self_exclusion', 'selfexclusion',
                           'responsible_gambling', 'cooling_off', 'timeout',
                           'break', 'limit_reached']
    for tag in SELF_EXCLUSION_TAGS:
        if tag in tags:
            return 'SELF_EXCLUSION'

    # 5. Operator closed
    OPERATOR_TAGS = ['banned', 'blocked', 'operator_closed', 'terms_violation',
                     'abuse', 'closed_by_operator']
    for tag in OPERATOR_TAGS:
        if tag in tags:
            return 'OPERATOR_CLOSED'

    # 6. Inactivity
    INACTIVE_TAGS = ['dormant', 'inactive', 'inactive_closed', 'abandoned']
    for tag in INACTIVE_TAGS:
        if tag in tags:
            return 'INACTIVE'

    # 7. Check deactivation reason from backend (if available)
    backend_reason = player.get('closed_reason', '')
    if backend_reason:
        return backend_reason.upper()

    # Default if closed but reason unknown
    return 'UNKNOWN'
```

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CLOSED REASON HIERARCHY                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Priority │ Reason         │ Source Tags                │ Action           │
│  ─────────┼────────────────┼────────────────────────────┼───────────────── │
│  1        │ GAMSTOP/CRUKS  │ gamstop, cruks, oasis      │ Legal exclusion  │
│  2        │ FRAUD          │ fraud, aml, bonus_abuse    │ Permanent ban    │
│  3        │ KYC_FAILED     │ kyc_failed, doc_rejected   │ Require docs     │
│  4        │ SELF_EXCLUSION │ self-exclusion, timeout    │ Wait period      │
│  5        │ OPERATOR       │ banned, terms_violation    │ Review case      │
│  6        │ INACTIVE       │ dormant, abandoned         │ Reactivation OK  │
│  7        │ UNKNOWN        │ (no matching tags)         │ Investigate      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.3 KYC Status Detection

```python
def detect_kyc_status(player: dict) -> str:
    """
    Determine KYC verification status from tags.

    Priority order: verified > pre_verified > psp_trusted_verified > unverified
    """
    tags = player.get('tags', [])
    if isinstance(tags, str):
        tags = [t.strip().lower() for t in tags.split(',')]
    else:
        tags = [t.lower() for t in tags]

    # Check in priority order
    KYC_PRIORITY = [
        ('verified', 'verified'),
        ('pre_verified', 'pre_verified'),
        ('pre-verified', 'pre_verified'),
        ('preverified', 'pre_verified'),
        ('psp_trusted_verified', 'psp_trusted_verified'),
        ('psp-trusted-verified', 'psp_trusted_verified'),
        ('psp_trusted', 'psp_trusted_verified'),
    ]

    for tag_check, kyc_status in KYC_PRIORITY:
        if tag_check in tags:
            return kyc_status

    return 'unverified'


# KYC Status → S-Score mapping
KYC_SCORES = {
    'verified': 5,              # Full verification complete
    'pre_verified': 3,          # Partial verification (no files, only text)
    'psp_trusted_verified': 2,  # PSP trusts them, no full KYC
    'unverified': 1             # No verification
}
```

### 7.4 Grade/VIP Level Detection

> **⚠️ INTERNAL METRIC** — `grade` is an **internal operator metric** used for analytics and CRM segmentation.
> - **NOT visible to players** — players never see their grade
> - **NOT related to Loyalty Program** — completely separate from Cheese Club levels
> - **Purpose:** Internal prioritization, VIP team assignment, bonus eligibility rules

```python
def detect_grade(player: dict) -> str:
    """
    Determine player grade/level from tags and vip_level.

    ⚠️ INTERNAL METRIC — not visible to player, not related to loyalty program.

    Priority: metal_tier > vip_status > pre-vip > regular
    Returns display string with emoji.
    """
    tags = player.get('tags', [])
    if isinstance(tags, str):
        tags = [t.strip().lower() for t in tags.split(',')]
    else:
        tags = [t.lower() for t in tags]

    vip_level = player.get('vip_level', '').upper()
    vip_status = player.get('vip_status', '')

    # 1. Check for metal tier (highest priority)
    METAL_TIERS = {
        'GOLD': 'GOLD ⭐️',
        'SILVER': 'SILVER ⭐️',
        'BRONZE': 'BRONZE ⭐️',
        'COPPER': 'COPPER ⭐️',
    }

    if vip_level in METAL_TIERS:
        return METAL_TIERS[vip_level]

    # Also check tags for metal tier
    for metal, display in METAL_TIERS.items():
        if metal.lower() in tags:
            return display

    # 2. Check VIP status
    if vip_status == 'vip' or 'vip' in tags:
        return 'vip'

    # 3. Check pre-VIP
    if vip_status == 'pre-vip' or 'pre-vip' in tags or 'previp' in tags:
        return 'pre-vip'

    # 4. No special status
    return ''


# Grade hierarchy for internal sorting (NOT visible to player)
# ⚠️ Not related to loyalty program levels (e.g., Cheese Club)
GRADE_HIERARCHY = {
    'GOLD ⭐️': 6,
    'SILVER ⭐️': 5,
    'BRONZE ⭐️': 4,
    'COPPER ⭐️': 3,
    'vip': 2,
    'pre-vip': 1,
    '': 0
}
```

```
┌─────────────────────────────────────────────────────────────────────────────┐
│          GRADE DETECTION FLOW (⚠️ INTERNAL — not visible to player)          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                         CHECK TAGS                                          │
│                              │                                              │
│                              ▼                                              │
│                    ┌─────────────────┐                                      │
│                    │ Has metal tier? │                                      │
│                    │ (GOLD/SILVER/   │                                      │
│                    │  BRONZE/COPPER) │                                      │
│                    └────────┬────────┘                                      │
│                    Yes      │      No                                       │
│                     │       │       │                                       │
│                     ▼       │       ▼                                       │
│              Return         │    ┌─────────────────┐                        │
│              "{METAL} ⭐️"  │    │ Has 'vip' tag?  │                        │
│                             │    └────────┬────────┘                        │
│                             │    Yes      │      No                         │
│                             │     │       │       │                         │
│                             │     ▼       │       ▼                         │
│                             │  Return     │    ┌─────────────────┐          │
│                             │  "vip"      │    │ Has 'pre-vip'?  │          │
│                             │             │    └────────┬────────┘          │
│                             │             │    Yes      │      No           │
│                             │             │     │       │       │           │
│                             │             │     ▼       │       ▼           │
│                             │             │  Return     │    Return ""      │
│                             │             │  "pre-vip"  │    (regular)      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.5 Complete Tag Parser

```python
def parse_player_tags(player: dict) -> dict:
    """
    Parse all tag-derived fields for a player.
    Returns enriched player data.
    """
    return {
        **player,
        'status': detect_status(player),
        'closed_reason': detect_closed_reason(player) if detect_status(player) == 'closed' else None,
        'kyc': detect_kyc_status(player),
        'grade': detect_grade(player),
    }
```

---

## 8. All Rate/Ratio Formulas (Все формулы коэффициентов)

### 8.1 Core Financial Ratios

| # | Field | Formula | Description | Unit |
|:-:|:------|:--------|:------------|:-----|
| 1 | `wd_dep_rate` | `(wd_sum / dep_sum) × 100` | Withdrawals to Deposits | % |
| 2 | `bonus_dep_rate` | `(bonus_used / dep_sum) × 100` | Bonuses to Deposits | % |
| 3 | `bonus_ggr_rate` | `(bonus_used / ggr) × 100` | Bonuses to GGR | % |
| 4 | `rtp` | `(win_sum / bet_sum) × 100` | Return to Player | % |
| 5 | `bet_dep_rate` | `bet_sum / dep_sum` | Turnover multiplier | × |
| 6 | `ggr_ratio` | `(ggr / dep_sum) × 100` | GGR to Deposits | % |
| 7 | `ngr_dep_rate` | `(real_ngr / dep_sum) × 100` | Real NGR to Deposits | % |

### 8.2 Efficiency & Engagement Ratios

| # | Field | Formula | Description | Unit |
|:-:|:------|:--------|:------------|:-----|
| 8 | `dep_success_rate` | `(dep_cnt / (dep_cnt + dep_cnt_failed)) × 100` | Successful deposits % | % |
| 9 | `bonus_wager_rate` | `(bonus_wager_done / bonus_used) × 100` | % bonuses successfully wagered | % |
| 10 | `bonus_used_rate` | `(bonus_used / bonus_total) × 100` | % of issued bonuses used | % |
| 11 | `dep_per_session` | `dep_cnt / login_cnt` | Deposits per login session | × |
| 12 | `bet_per_session` | `bet_cnt / login_cnt` | Bets per login session | × |
| 13 | `avg_session_value` | `bet_sum / login_cnt` | Average betting per session | € |

### 8.3 Profitability Ratios (P-Score Components)

| # | Field | Formula | Description | Thresholds |
|:-:|:------|:--------|:------------|:-----------|
| 14 | `in_out` | `dep_sum - wd_sum` | Net cash flow | 🟢>€5k 🟡>€1k 🟠>€0 🔴<€0 |
| 15 | `wd_dep_rate` | `(wd_sum / dep_sum) × 100` | Cashout ratio | 🟢<30% 🟡<45% 🟠<60% 🔴≥100% |
| 16 | `ggr_ratio` | `(ggr / dep_sum) × 100` | GGR efficiency | 🟢>30% 🟡>15% 🟠>0% 🔴<0% |
| 17 | `bet_dep_rate` | `bet_sum / dep_sum` | Turnover multiplier | 🟢>15× 🟡>10× 🟠>5× 🔴<2× |

### 8.4 Security Ratios (S-Score Behavioral — 40% of S-Score)

> **S_behavioral = bonus_dep_rate (50%) + bonus_ggr_rate (50%)** — NO rtp in S-Score!

**Thresholds adapt to deposit count:**
- **≤5 deposits:** Score = 5 (not enough data, welcome bonuses expected)
- **6-10 deposits:** SOFT thresholds (max penalty = Score 3)
- **>10 deposits:** FULL thresholds (standard evaluation)

| # | Field | Formula | Description | Weight | FULL Thresholds (>10 deps) | SOFT Thresholds (6-10 deps) |
|:-:|:------|:--------|:------------|:------:|:---------------------------|:---------------------------|
| 18 | `bonus_dep_rate` | `(bonus_used / dep_sum) × 100` | Bonus dependency | 50% | 🟢<15% 🟡<25% 🟠<50% 🔴>70% | 🟢<25% 🟡<50% 🟠≤70% max=3 |
| 19 | `bonus_ggr_rate` | `(bonus_used / ggr) × 100` | Bonus impact on profit | 50% | 🟢<20% 🟡<30% 🟠<60% 🔴>75% | 🟢<40% 🟡<60% 🟠≤75% max=3 |

### 8.4.1 RTP (Standalone Metric — NOT in S-Score)

| # | Field | Formula | Description | Thresholds |
|:-:|:------|:--------|:------------|:-----------|
| 20 | `rtp` | `(win_sum / bet_sum) × 100` | Return to Player | 🟢<95.5% (5), 🟢 95.5-97% (4), 🟡 97-98.5% (3), 🟠 98.5-100% (2), 🔴 >100% (1) |

### 8.5 Velocity Ratios

| # | Field | Formula | Description | Thresholds |
|:-:|:------|:--------|:------------|:-----------|
| 21 | `velocity` | `(dep_sum_7d × 4) / dep_sum_30d` | Weekly vs monthly trend | 🟢>1.5 🟢>1.0 🟡>0.5 🔴<0.5 |
| 22 | `dep_acceleration` | `dep_sum_7d / dep_sum_prev_7d` | Week-over-week growth | >1 = growing |
| 23 | `bet_velocity` | `(bet_sum_7d × 4) / bet_sum_30d` | Betting trend | Similar to velocity |

### 8.6 Formula Summary Code

```python
def calculate_all_ratios(player: dict) -> dict:
    """
    Calculate all rate/ratio fields for a player.
    Returns dict with all calculated ratios.

    IMPORTANT: Handle division by zero for all ratios!
    """
    dep_sum = player.get('dep_sum', 0) or 0.001  # Avoid div/0
    ggr = player.get('ggr', 0) or 0.001
    bet_sum = player.get('bet_sum', 0) or 0.001
    bonus_total = player.get('bonus_total', 0) or 0.001
    bonus_used = player.get('bonus_used', 0)
    login_cnt = player.get('login_cnt', 0) or 1
    dep_sum_30d = player.get('dep_sum_30d', 0) or 0.001

    return {
        # Core financial
        'wd_dep_rate': (player.get('wd_sum', 0) / dep_sum) * 100,
        'bonus_dep_rate': (bonus_used / dep_sum) * 100,
        'bonus_ggr_rate': (bonus_used / abs(ggr)) * 100 if ggr > 0 else 0,
        'rtp': (player.get('win_sum', 0) / bet_sum) * 100,
        'bet_dep_rate': bet_sum / dep_sum,
        'ggr_ratio': (ggr / dep_sum) * 100,
        'ngr_dep_rate': (player.get('real_ngr', 0) / dep_sum) * 100,

        # Efficiency
        'dep_success_rate': calculate_success_rate(player),
        'bonus_wager_rate': (player.get('bonus_wager_done', 0) / bonus_used) * 100 if bonus_used > 0 else 0,
        'bonus_used_rate': (bonus_used / bonus_total) * 100,
        'dep_per_session': player.get('dep_cnt', 0) / login_cnt,
        'bet_per_session': player.get('bet_cnt', 0) / login_cnt,
        'avg_session_value': bet_sum / login_cnt,

        # Profitability
        'in_out': player.get('dep_sum', 0) - player.get('wd_sum', 0),

        # Velocity
        'velocity': (player.get('dep_sum_7d', 0) * 4) / dep_sum_30d,
    }


def calculate_success_rate(player: dict) -> float:
    """Calculate deposit success rate."""
    dep_cnt = player.get('dep_cnt', 0)
    dep_cnt_failed = player.get('dep_cnt_failed', 0)
    total = dep_cnt + dep_cnt_failed
    if total == 0:
        return 0.0
    return (dep_cnt / total) * 100
```

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    RATIO FORMULAS QUICK REFERENCE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  FINANCIAL RATIOS (% format)                                                │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━                                                  │
│  wd_dep_rate    = wd_sum / dep_sum × 100        % withdrawn                 │
│  bonus_dep_rate = bonus_used / dep_sum × 100    % bonus dependency          │
│  bonus_ggr_rate = bonus_used / ggr × 100        % bonus impact              │
│  ggr_ratio      = ggr / dep_sum × 100           % profit margin             │
│  ngr_dep_rate   = real_ngr / dep_sum × 100      % net profit                │
│  rtp            = win_sum / bet_sum × 100       % return to player          │
│                                                                             │
│  MULTIPLIER RATIOS (× format)                                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━                                                │
│  bet_dep_rate   = bet_sum / dep_sum             turnover multiplier         │
│  velocity       = (dep_7d × 4) / dep_30d        weekly vs monthly           │
│  dep_per_sess   = dep_cnt / login_cnt           deposits per login          │
│                                                                             │
│  EDGE CASES                                                                 │
│  ━━━━━━━━━━━━                                                               │
│  • dep_sum = 0 → all ratios = 0 or undefined                               │
│  • ggr < 0 → bonus_ggr_rate uses abs(ggr) or = 0                           │
│  • bet_sum = 0 → rtp = 0                                                   │
│  • dep_sum_30d = 0 → velocity = 0 or undefined                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Quick Reference

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    iGAMING ANALYTICS QUICK REFERENCE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  BONUS METRICS                                                              │
│  ━━━━━━━━━━━━━━                                                             │
│  bonus_total = pending + active + wager_done + lost + expired + canceled   │
│  bonus_used  = wager_done + lost + active  ← USE THIS FOR NGR!             │
│                                                                             │
│  FINANCIAL FORMULAS                                                         │
│  ━━━━━━━━━━━━━━━━━━━                                                        │
│  in_out   = dep_sum - wd_sum                                               │
│  ggr      = bet_sum - win_sum                                              │
│  ngr      = ggr - bonus_total                    (simplified)              │
│  real_ngr = ggr - bonus_used - correction - chargeback - refund (accurate) │
│  spend    = in_out - balance - wd_pending                                  │
│                                                                             │
│  MULTI-CURRENCY                                                             │
│  ━━━━━━━━━━━━━━━                                                            │
│  • Store in original currency                                               │
│  • Convert to EUR at transaction time                                       │
│  • Aggregate in EUR for analysis                                            │
│  • Display: "€5,420 (EUR, BTC)"                                            │
│                                                                             │
│  CRYPTO DECIMALS                                                            │
│  ━━━━━━━━━━━━━━━━                                                           │
│  BTC: 8  │  ETH: 18  │  USDT: 6  │  Use Decimal, not float!               │
│                                                                             │
│  PSP TRUST LEVELS                                                           │
│  ━━━━━━━━━━━━━━━━━                                                          │
│  trusted_verified > lvl_4 > lvl_3 > lvl_2 > lvl_1 > untrusted              │
│  Cross-brand metric from payment provider!                                  │
│                                                                             │
│  RECENCY (currency-agnostic)                                                │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━                                                 │
│  dep_recency = NOW() - last_dep_dt  (days)                                 │
│  velocity = (dep_sum_7d × 4) / dep_sum_30d                                 │
│                                                                             │
│  KEY RATIOS                                                                 │
│  ━━━━━━━━━━                                                                 │
│  wd_dep_rate     = wd_sum / dep_sum        (🟢<30% 🟡<45% 🟠<60% 🔴≥100%) │
│  bonus_dep_rate  = bonus_used / dep_sum    (🟢<15% 🟡<25% 🟠<50% 🔴>70%)  │
│  bonus_ggr_rate  = bonus_used / ggr        (🟢<20% 🟡<30% 🟠<60% 🔴>75%)  │
│  ggr_ratio       = ggr / dep_sum           (🟢>30% 🟡>15% 🟠>0% 🔴<0%)    │
│  bet_dep_rate    = bet_sum / dep_sum       (🟢>15× 🟡>10× 🟠>5× 🔴<2×)    │
│  rtp (standalone)= win_sum / bet_sum       (🟢<95.5%(5) 🟢<97%(4) 🔴>100%(1)) │
│                                                                             │
│  S-SCORE BEHAVIORAL (40% of S-Score)                                       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                                        │
│  bonus_dep_rate: 50%  +  bonus_ggr_rate: 50%  ← NO rtp in S-Score!         │
│                                                                             │
│  S_BEHAVIORAL BY DEPOSIT COUNT                                              │
│  ≤5 deps:   Score = 5 (not enough data, welcome bonuses expected)           │
│  6-10 deps: SOFT thresholds (max penalty = Score 3)                         │
│  >10 deps:  FULL thresholds (standard evaluation)                           │
│                                                                             │
│  TAG PARSING                                                                │
│  ━━━━━━━━━━━━                                                               │
│  status: disabled field > closed_tags > 'active'                           │
│  closed_reason: GAMSTOP > FRAUD > KYC_FAILED > SELF_EXCLUSION > INACTIVE   │
│  kyc: verified > pre_verified > psp_trusted_verified > unverified          │
│  grade: GOLD⭐️ > SILVER⭐️ > BRONZE⭐️ > COPPER⭐️ > vip > pre-vip > ''     │
│         ⚠️ INTERNAL METRIC — not visible to player, ≠ loyalty program      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

*© 2025 iGaming Analytics — Fundamental Axioms v1.2.1*
