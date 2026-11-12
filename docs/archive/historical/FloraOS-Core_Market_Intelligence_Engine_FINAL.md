> [!NOTE]
> **Tài liệu lịch sử — đã được thay thế bởi bản v2.0.**
> Đây là đặc tả gốc v1.0 của Market Intelligence Engine, dùng làm cơ sở đối chiếu kiến trúc và cho kế hoạch Đợt A (xem `../../claude/ke-hoach-market-intelligence-dot-a-19-09-2026.md` trong project claude.ai, hoặc lịch sử trao đổi liên quan). Bản đầy đủ, cập nhật và có hiệu lực dẫn hướng là **[`ALG-Intelligence-Engine_FINAL_v2.0.md`](./ALG-Intelligence-Engine_FINAL_v2.0.md)** (gộp cả Market Intelligence và Product Intelligence). Giữ lại tệp này để truy vết quyết định — không dùng làm nguồn quyết định mới.
>
> Nạp vào `docs/dac-ta/` ngày 19/09/2026.

# FloraOS-Core — Market Intelligence Engine
## FINAL IMPLEMENTATION SPECIFICATION v1.0

> **Purpose:** This document is the implementation contract for Claude/Cursor to build the Market Intelligence Engine inside `floraos-core`.
>
> **Primary outcome:** Discover market trends and convert them into ranked, actionable **viral topic opportunities** that can be passed directly to FloraOS Content/Writer/Creative Agents.
>
> **Core principle:** Research centrally once, store shared intelligence, then personalize it for each tenant. Do not make every tenant independently research the same market.

---

# 1. Executive Summary

FloraOS-Core needs a reusable, industry-agnostic intelligence layer that answers:

1. What is changing in the market?
2. What topics are currently rising?
3. Which topics show viral/content momentum?
4. Which topics have commercial relevance?
5. What should a specific tenant create content about now?

The engine must NOT be designed as a simple Google Trends dashboard.

The target pipeline is:

```text
MARKET SIGNALS
      ↓
TREND DETECTION
      ↓
TOPIC DISCOVERY
      ↓
VIRALITY ANALYSIS
      ↓
COMMERCIAL RELEVANCE
      ↓
CONTENT OPPORTUNITY
      ↓
TENANT PERSONALIZATION
      ↓
RECOMMENDED TOPICS
      ↓
WRITER / CREATIVE AGENTS
```

The system must be:

- multi-tenant
- provider-agnostic
- fallback-capable
- background-job based
- historical/time-series aware
- industry-agnostic
- geography-aware
- extensible
- inexpensive at MVP scale
- production-ready without unnecessary microservices

---

# 2. Non-Goals

Do NOT build the following in V1:

- a large microservice architecture
- a custom machine-learning virality model
- a dedicated vector database
- BERTopic as a mandatory dependency
- KeyBERT as a mandatory dependency
- real-time scraping infrastructure
- a full social-media publishing system
- a complex data lake
- tenant-specific full market research jobs
- a proprietary forecasting model

These may be introduced later only when actual data volume and product requirements justify them.

---

# 3. Architecture Decision

## 3.1 Recommended V1 Architecture

Use one logical module/service inside `floraos-core`:

```text
market-intelligence/
│
├── collectors/
├── providers/
├── normalizer/
├── trend-engine/
├── topic-engine/
├── scoring/
├── opportunity-engine/
├── personalization/
├── scheduler/
├── repository/
└── api/
```

Do NOT create one network service for every algorithm.

Open-source libraries should normally be imported and executed locally inside this module.

Example:

```text
FloraOS
   ↓
TopicEngine interface
   ↓
Local implementation
   ↓
LLM / optional BERTopic / embeddings
```

Not:

```text
FloraOS
   ↓
HTTP
   ↓
BERTopic microservice
```

---

# 4. Core Architecture

```text
                         FLORAOS-CORE
                              │
                              ▼
                ┌───────────────────────────┐
                │ MARKET INTELLIGENCE      │
                │ ENGINE                   │
                └─────────────┬─────────────┘
                              │
              ┌───────────────┼────────────────┐
              ▼               ▼                ▼
       TREND COLLECTION   CONTENT SIGNALS   MARKET CONTEXT
              │               │                │
              ▼               ▼                ▼
        Google/TikTok/     views/likes/     news/search/
        YouTube/etc.       shares/comments   industry data
              │               │                │
              └───────────────┼────────────────┘
                              ▼
                       DATA NORMALIZER
                              │
                              ▼
                    SHARED INTELLIGENCE DB
                              │
                 ┌────────────┴────────────┐
                 ▼                         ▼
          TREND ENGINE               TOPIC ENGINE
                 │                         │
       growth/velocity/             extraction/
       acceleration/                clustering/
       persistence                  deduplication
                 │                         │
                 └────────────┬────────────┘
                              ▼
                       SCORING ENGINE
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
         TREND SCORE      VIRAL SCORE    COMMERCIAL SCORE
              │               │               │
              └───────────────┼───────────────┘
                              ▼
                   CONTENT OPPORTUNITY
                              │
                              ▼
                  TENANT PERSONALIZATION
                              │
                              ▼
                     RECOMMENDED TOPICS
                              │
                              ▼
                 WRITER / CREATIVE AGENTS
```

---

# 5. Shared Intelligence Model

## 5.1 Critical architectural rule

**Research centrally. Personalize locally.**

Do NOT do:

```text
Tenant A → research
Tenant B → research
Tenant C → research
...
```

Do:

```text
                 GLOBAL RESEARCH
                       ↓
              SHARED INTELLIGENCE
                       ↓
          ┌────────────┼────────────┐
          ▼            ▼            ▼
       Tenant A     Tenant B     Tenant C
          ↓            ↓            ↓
     personalize   personalize   personalize
```

The same market intelligence can support thousands of tenants.

---

# 6. Intelligence Layers

## Layer 1 — Global Market Intelligence

Contains broadly reusable signals:

- trends
- keywords
- hashtags
- topics
- content signals
- growth
- velocity
- engagement
- geography
- platform
- time series
- source
- confidence

## Layer 2 — Industry Intelligence

Examples:

- florist
- F&B
- beauty
- fashion
- retail
- education
- real estate

Industry classification should be extensible.

## Layer 3 — Tenant Intelligence

Uses:

- tenant industry
- location
- products
- price range
- target audience
- business objective
- historical content performance
- brand positioning

to convert a global/industry trend into a tenant-specific opportunity.

---

# 7. Research Dimensions

The engine must support:

## Geography

At minimum:

```text
Global
Country
Region/Province
City
```

Example:

```text
Vietnam
Hanoi
Ho Chi Minh City
Da Nang
```

## Time windows

At minimum:

```text
24h
7d
30d
90d
```

Support longer historical windows when the provider supplies them.

## Platforms

Provider-dependent, but architecture must allow:

```text
Google Search / Trends
TikTok
YouTube
Reddit
News/Web
Other future providers
```

Do not hard-code business logic around a single platform.

---

# 8. Provider Architecture

## 8.1 Stable internal interfaces

The application must depend on internal interfaces, not vendor/repository implementations.

Example conceptual interface:

```text
TrendProvider
├── search_trends()
├── get_timeseries()
├── get_related_topics()
├── get_related_queries()
└── health_check()
```

Example content provider:

```text
ContentSignalProvider
├── search_content()
├── get_content_metrics()
├── get_trending_content()
└── health_check()
```

The exact implementation language/framework should follow the existing `floraos-core` stack.

---

# 9. Adapter Pattern

External repositories/APIs must be wrapped.

```text
FloraOS
   ↓
TrendProvider
   ↓
TrendsAPIAdapter
   ↓
External provider
```

Alternative:

```text
TrendProvider
   ↓
TrendScopeAdapter
```

This ensures:

- no vendor lock-in
- easy replacement
- independent testing
- fallback support
- stable FloraOS APIs

The rest of FloraOS must NOT import provider-specific SDKs directly.

---

# 10. Fallback Strategy

Use:

```text
Primary Provider
      ↓
Retry
      ↓
Fallback Provider
      ↓
Cached Data
      ↓
Graceful Degradation
```

Do not call every provider simultaneously just for redundancy.

Multiple providers should be called simultaneously only when their signals are intentionally used for cross-validation.

Example:

```text
Google growth
+
TikTok growth
+
YouTube growth
=
cross-platform confidence
```

If the primary provider fails:

```text
Provider A
   ↓ timeout
Provider B
   ↓ failure
Cached result
```

Returned data must contain freshness/status metadata.

Example:

```json
{
  "data_status": "cached",
  "freshness_minutes": 145,
  "provider": "fallback"
}
```

---

# 11. Provider Health

Track:

- availability
- latency
- error rate
- timeout rate
- quota/rate-limit status
- data freshness
- data completeness

Conceptual state:

```text
HEALTHY
DEGRADED
UNAVAILABLE
```

Provider selection should consider health.

---

# 12. Research Scheduling

## 12.1 Daily Deep Research

Run once per day.

Suggested default:

```text
06:00 local market/system time
```

The exact scheduler/timezone must be configurable.

Daily job:

```text
collect sources
↓
normalize
↓
update time series
↓
detect trends
↓
discover topics
↓
calculate scores
↓
generate opportunities
↓
persist
```

## 12.2 Intraday Pulse

Run every 2–4 hours.

This is NOT a full research job.

It checks for:

- sudden growth
- breakout topics
- abnormal engagement
- rapid cross-platform spread

## 12.3 Weekly Deep Analysis

Once per week:

```text
7D
30D
90D
seasonality
emerging trends
declining trends
persistent trends
```

---

# 13. Background Processing

Never make the user wait for full trend research.

Bad:

```text
User opens dashboard
↓
start research
↓
wait 5 minutes
↓
show result
```

Correct:

```text
Background worker
↓
research
↓
store results
↓
User opens dashboard
↓
read database
```

User-facing requests should primarily read precomputed intelligence.

---

# 14. V1 Trend Pipeline

```text
Scheduler
   ↓
Collector
   ↓
Provider
   ↓
Normalizer
   ↓
Raw Signals
   ↓
Trend Detection
   ↓
Topic Generation
   ↓
LLM Interpretation
   ↓
Scoring
   ↓
Content Opportunity
   ↓
Database
```

---

# 15. Data Normalization

All providers must map into a common internal format.

Example:

```json
{
  "source": "tiktok",
  "platform": "tiktok",
  "market": "VN",
  "region": "Hanoi",
  "industry": "florist",
  "topic": "hoa pastel",
  "metric": "growth",
  "value": 0.87,
  "captured_at": "2026-09-19T06:00:00+07:00"
}
```

Never expose provider-specific raw schemas to downstream agents.

---

# 16. Core Data Model

Use PostgreSQL if that is already the `floraos-core` persistence layer.

Suggested logical tables:

```text
market_sources
trend_signals
trend_timeseries
topics
topic_signals
content_signals
topic_scores
content_opportunities
industry_taxonomy
geographies
research_runs
provider_health
tenant_topic_recommendations
```

---

# 17. `market_sources`

Purpose: identify data origin.

Fields:

```text
id
provider
platform
source_type
status
last_success_at
last_error_at
created_at
updated_at
```

---

# 18. `trend_signals`

Purpose: normalized trend observations.

Fields:

```text
id
source_id
platform
country_code
region_code
city
industry_id
topic_raw
metric_name
metric_value
growth_rate
confidence
captured_at
created_at
```

Indexes:

```text
(platform, country_code, city, captured_at)
(industry_id, captured_at)
(topic_raw, captured_at)
```

---

# 19. `trend_timeseries`

Purpose: preserve historical trend movement.

Fields:

```text
id
topic_id
platform
geography_id
date
value
growth_rate
velocity
acceleration
confidence
```

This is essential.

Do not store only today's score.

---

# 20. `topics`

Canonical topic entity.

Fields:

```text
id
canonical_name
description
industry_id
language
status
first_seen_at
last_seen_at
created_at
updated_at
```

Possible status:

```text
emerging
rising
stable
declining
seasonal
breakout
```

These are descriptive system states, not political/electoral judgments.

---

# 21. `topic_signals`

Maps raw signals/content to canonical topics.

Fields:

```text
id
topic_id
source_id
external_reference
signal_type
signal_value
captured_at
```

This enables many sources to support one topic.

Example:

```text
#hoaPastel
pastel bouquet
pastel flower
pastel wedding
```

can map to:

```text
Canonical Topic:
Pastel Flowers
```

---

# 22. `content_signals`

Store content-level observations where available.

Fields:

```text
id
platform
external_content_id
topic_id
title
caption
url
views
likes
comments
shares
engagement_rate
published_at
captured_at
metadata_json
```

Do not assume every provider exposes every metric.

Null is preferable to fabricated data.

---

# 23. `topic_scores`

Store computed scores separately from raw data.

Fields:

```text
id
topic_id
geography_id
industry_id
period
trend_score
viral_score
commercial_score
content_opportunity_score
confidence
calculated_at
model_version
```

Version scores.

This allows future scoring-model upgrades without losing historical results.

---

# 24. `content_opportunities`

This is the main product output.

Fields:

```text
id
topic_id
industry_id
geography_id
audience
opportunity_summary
content_angles_json
recommended_formats_json
recommended_hooks_json
recommended_products_json
trend_score
viral_score
commercial_score
content_opportunity_score
confidence
expires_at
created_at
updated_at
```

---

# 25. Topic Discovery

The engine must distinguish:

```text
Raw signal
      ↓
Trend
      ↓
Topic
```

Example:

```text
#hoaPastel
pastel bouquet
pink bouquet
pastel flowers
pastel wedding
```

should be clustered/understood as related signals rather than automatically creating five independent topics.

---

# 26. V1 Topic Engine

Use the simplest reliable approach first:

```text
Raw trend/content signals
        ↓
LLM
        ↓
canonical topic
        ↓
deduplicate
        ↓
store
```

Do NOT make BERTopic mandatory in V1.

---

# 27. V2 Topic Engine

Only after enough historical data exists, consider:

```text
Embeddings
+
semantic similarity
+
clustering
+
BERTopic
```

Candidate open-source component:

- BERTopic

Use it behind:

```text
TopicEngine
```

so it remains replaceable.

---

# 28. V1 LLM Responsibilities

LLM should:

- understand raw trend descriptions
- normalize topic names
- merge duplicate topics
- explain why a topic is rising
- identify content angles
- identify likely audience
- identify commercial intent
- generate topic recommendations
- produce structured JSON only

LLM should NOT be responsible for raw metric calculation.

Metrics come from collected data.

---

# 29. Viral Analysis

Viral does not simply mean high views.

A topic can have:

```text
high views + low growth
```

and be established rather than emerging.

A topic with:

```text
moderate views + very high acceleration
```

may be more useful for trend discovery.

Therefore calculate separately:

```text
Velocity
Growth
Acceleration
Engagement
Share rate
Comment rate
Cross-platform spread
Persistence
```

Where metrics are available.

---

# 30. Viral Score

V1 can use a transparent weighted formula.

Example starting model:

```text
Viral Score =
  20% velocity
+ 20% growth
+ 15% engagement rate
+ 10% share rate
+ 10% comment rate
+ 15% cross-platform spread
+ 10% persistence
```

Weights MUST be configurable.

If a metric is unavailable, normalize using available signals and record lower confidence.

Do not fabricate missing metrics.

---

# 31. Trend Score

Suggested V1 concept:

```text
Trend Score =
  growth
+ velocity
+ acceleration
+ persistence
+ geographic relevance
```

Normalize to:

```text
0–100
```

Store the scoring version.

Example:

```text
model_version = "trend_v1"
```

---

# 32. Commercial Score

Commercial relevance must be separate from virality.

Signals can include:

```text
product/search intent
transactional keywords
product mentions
price-related intent
service intent
tenant product fit
```

Example:

```text
viral meme
→ high viral score
→ low commercial score

"hoa pastel 299K"
→ high viral score
→ high commercial score
```

---

# 33. Content Opportunity Score

This is the key decision-support score.

Concept:

```text
Content Opportunity =
  Trend
+ Viral
+ Commercial
+ Tenant Fit
+ Freshness
```

Suggested V1:

```text
30% trend
25% viral
20% commercial
15% tenant fit
10% freshness
```

Weights must be configurable.

This is NOT a prediction of guaranteed performance.

It is an internal prioritization signal.

---

# 34. Tenant Personalization

Global topic:

```text
Pastel Flowers
```

Tenant profile:

```text
industry = florist
city = Hanoi
price_range = 250K–700K
audience = women 20–35
objective = sales
```

Personalization produces:

```text
5 mẫu hoa pastel dưới 500K đang được quan tâm
```

Another tenant:

```text
industry = florist
city = HCMC
price_range = premium
objective = wedding
```

may receive:

```text
Pastel wedding bouquet trends
```

Same market signal.

Different content opportunity.

---

# 35. Tenant Recommendation API

Example:

```http
GET /api/market-intelligence/opportunities
```

Query parameters:

```text
industry
country
region
city
tenant_id
period
limit
```

Response:

```json
{
  "generated_at": "...",
  "freshness": "today",
  "topics": [
    {
      "topic": "Hoa pastel",
      "trend_score": 86,
      "viral_score": 91,
      "commercial_score": 78,
      "content_opportunity_score": 87,
      "status": "rising",
      "angles": [
        "5 mẫu hoa pastel",
        "Hoa pastel dưới 300K",
        "Pastel cho sinh nhật"
      ],
      "recommended_formats": [
        "tiktok",
        "reels",
        "facebook"
      ]
    }
  ]
}
```

---

# 36. Additional APIs

Implement only what is necessary.

```http
GET /api/market-intelligence/trends
GET /api/market-intelligence/topics
GET /api/market-intelligence/opportunities
GET /api/market-intelligence/breakouts
```

Optional internal/admin endpoints:

```http
POST /internal/market-intelligence/research
GET /internal/market-intelligence/runs
GET /internal/market-intelligence/providers/health
```

Protect internal endpoints.

---

# 37. Content Agent Integration

The Content Agent should consume:

```text
content_opportunities
```

not raw provider data.

Example:

```text
Market Intelligence
        ↓
Content Opportunity
        ↓
Writer Agent
        ↓
Script
        ↓
Creative Agent
        ↓
Image / Video
        ↓
Voice
        ↓
Caption
        ↓
QA
        ↓
Publishing
```

This keeps agent responsibilities clean.

---

# 38. Freshness

Every intelligence record should make freshness explicit.

Example:

```text
fresh
stale
cached
partial
failed
```

Do not show stale data as if it were current.

Recommended fields:

```text
captured_at
updated_at
expires_at
data_status
provider
```

---

# 39. Caching

Use the existing cache technology in `floraos-core` if one exists.

If Redis is already available, it can be used for:

- recent opportunity lists
- provider responses
- job locks
- rate-limit state
- temporary research data

PostgreSQL remains the source of truth for persisted intelligence.

Do not add Redis only for this feature if the existing architecture has no need for it.

---

# 40. Research Run Tracking

Each research execution must have a record.

Fields:

```text
id
run_type
started_at
completed_at
status
sources_attempted
sources_succeeded
sources_failed
records_collected
topics_created
opportunities_created
error_summary
```

Possible run types:

```text
daily_deep
intraday_pulse
weekly_deep
manual
```

This is essential for debugging.

---

# 41. Idempotency

Research jobs may retry.

The implementation must avoid duplicate records.

Use deterministic keys where possible:

```text
provider
external_id
capture_date
metric
geography
```

and/or idempotency keys.

---

# 42. Rate Limiting

Every external provider adapter must support:

- timeout
- retry
- exponential backoff
- rate-limit handling
- quota detection

Never allow one provider to block the entire research job.

---

# 43. Partial Failure

Example:

```text
Google       SUCCESS
TikTok       SUCCESS
YouTube      TIMEOUT
News         SUCCESS
```

The research run should become:

```text
PARTIAL_SUCCESS
```

and continue.

Do NOT discard all successful data because one provider failed.

---

# 44. Provider Licensing / Commercial Use

Before production use, verify for every external repository/provider:

```text
license
commercial use
API terms
scraping restrictions
rate limits
data retention rights
redistribution restrictions
attribution requirements
```

Important:

**Open-source code does not automatically mean that the underlying data can be commercially collected, stored, or redistributed without restrictions.**

Provider adapters must therefore be replaceable.

---

# 45. Candidate Components

These are candidates, not mandatory dependencies.

## Trend aggregation

- Trends API
- TrendScope
- other commercial/open providers

## Topic discovery

- LLM
- BERTopic
- Sentence Transformers

## Keyword extraction

- KeyBERT

## Virality research/reference

- virality-prediction

Do not integrate all of these into V1.

---

# 46. Recommended V1 Stack

Keep V1 minimal:

```text
Existing FloraOS-Core backend
+
PostgreSQL
+
Scheduler / background worker
+
1 primary Trend Provider
+
optional fallback provider
+
LLM
```

No additional ML stack is required initially.

---

# 47. V2

Add only when data volume justifies it:

```text
Embeddings
Semantic deduplication
Topic clustering
BERTopic
More social sources
Better cross-platform scoring
```

---

# 48. V3

After sufficient historical content data:

```text
Virality model
Tenant-specific recommendation model
Performance feedback loop
Trend forecasting
Content performance learning
```

---

# 49. Learning Loop

Later, connect published content performance back into intelligence.

```text
Trend
 ↓
Topic
 ↓
Content
 ↓
Publish
 ↓
Views
Likes
Comments
Shares
Conversions
 ↓
Performance data
 ↓
Learning
 ↓
Better opportunity scoring
```

Important:

Do not claim the system "learns" from content performance until enough observations exist.

---

# 50. Example End-to-End

Input:

```text
industry = florist
market = Hanoi
period = 7d
objective = sales
```

Research:

```text
Google
TikTok
YouTube
News
```

Signals:

```text
pastel bouquet
pastel flowers
pink bouquet
birthday flowers
```

Topic engine:

```text
Canonical topic:
Hoa pastel
```

Trend analysis:

```text
growth ↑
velocity ↑
cross-platform spread ↑
```

Scoring:

```text
trend_score = 86
viral_score = 91
commercial_score = 78
```

Tenant personalization:

```text
5 mẫu hoa pastel dưới 500K
```

Content opportunity:

```text
Hook:
"Đây là 5 mẫu hoa pastel đang được khách trẻ săn tìm..."

Formats:
TikTok
Reels
Facebook

Angles:
5 mẫu
price
birthday
gift
color psychology
```

Then:

```text
→ Writer Agent
→ Creative Agent
→ QA
→ Publishing
```

---

# 51. Observability

Track:

```text
research success rate
provider failure rate
provider latency
records collected
topic generation rate
duplicate rate
LLM failure rate
scoring failures
stale-data rate
API latency
```

Use the existing logging/monitoring stack in `floraos-core`.

Do not introduce a second observability platform unless necessary.

---

# 52. Security

Requirements:

- provider API keys only on backend
- never expose provider credentials to tenants
- tenant filters enforced server-side
- shared intelligence must not expose tenant-private data
- tenant-specific performance data must remain tenant-scoped
- internal research endpoints authenticated
- audit manual research runs
- sanitize external text before storing/rendering

---

# 53. Multi-Tenant Data Isolation

Important distinction:

### Shared

```text
market trends
public content signals
canonical topics
public market intelligence
```

### Tenant-private

```text
tenant catalog
tenant sales data
tenant content history
tenant engagement data
tenant recommendations
```

A tenant must never see another tenant's private performance data.

---

# 54. Performance Requirements

User-facing endpoints should not execute full research.

Target architecture:

```text
Background research → database
User request → database/cache
```

The opportunity API should be optimized for fast reads.

Recommended indexes must be added based on actual query patterns.

---

# 55. Failure Scenarios

Implement and test:

### Provider timeout

```text
A timeout
→ retry
→ fallback
→ cache
```

### One provider unavailable

```text
continue other providers
→ PARTIAL_SUCCESS
```

### LLM unavailable

```text
retain raw/canonical trend data
→ retry topic interpretation later
```

### Database temporary failure

```text
job fails safely
→ retry
→ no duplicate records
```

### No fresh data

```text
serve last valid data
→ clearly mark stale
```

---

# 56. Testing Strategy

## Unit tests

Test:

- provider adapters
- normalization
- scoring
- topic deduplication
- freshness
- fallback logic
- idempotency
- tenant filtering

## Integration tests

Test:

```text
Provider
→ normalizer
→ database
→ topic engine
→ scoring
→ opportunity API
```

## Failure tests

Simulate:

- timeout
- 429/rate limit
- malformed response
- provider outage
- LLM outage
- partial source failure

## Regression tests

Store representative trend fixtures and ensure provider changes do not silently break normalized output.

---

# 57. Acceptance Criteria

V1 is complete only when:

- [ ] A scheduled job can execute research without user interaction.
- [ ] At least one trend provider is integrated behind an adapter.
- [ ] A fallback provider or cached fallback exists.
- [ ] Provider-specific schemas do not leak into core business logic.
- [ ] Raw signals are normalized.
- [ ] Historical trend observations are persisted.
- [ ] Canonical topics can be generated.
- [ ] Duplicate/near-duplicate topics can be merged.
- [ ] Trend score is calculated.
- [ ] Viral score is calculated where sufficient metrics exist.
- [ ] Commercial score is separated from viral score.
- [ ] Content Opportunity Score is calculated.
- [ ] Tenant personalization works.
- [ ] `/opportunities` returns structured recommendations.
- [ ] Research runs are tracked.
- [ ] Partial provider failure does not destroy the entire run.
- [ ] User-facing requests do not trigger full research.
- [ ] Tenant-private data is isolated.
- [ ] Provider credentials are protected.
- [ ] License/ToS checks are documented for every production provider.
- [ ] Automated tests cover critical paths.
- [ ] System can operate with only the V1 dependency set.

---

# 58. Implementation Order

Claude/Cursor MUST implement in this order unless the existing codebase requires a justified deviation.

## Phase 0 — Inspect Existing Architecture

Before coding:

1. inspect `floraos-core`
2. identify backend framework
3. identify database
4. identify scheduler/background-job system
5. identify existing caching
6. identify existing LLM abstraction
7. identify existing tenant model
8. identify existing API conventions
9. identify logging/monitoring
10. reuse existing infrastructure wherever possible

Do NOT introduce duplicate infrastructure.

---

## Phase 1 — Domain Model

Create:

```text
MarketSource
TrendSignal
TrendTimeseries
Topic
TopicSignal
ContentSignal
TopicScore
ContentOpportunity
ResearchRun
ProviderHealth
```

Add migrations and indexes.

---

## Phase 2 — Provider Interfaces

Create:

```text
TrendProvider
ContentSignalProvider
```

Create adapter abstraction.

Implement one primary provider.

Implement fallback or cached fallback.

---

## Phase 3 — Normalization

Build normalized internal models.

Provider output must never be passed directly to LLM/business logic.

---

## Phase 4 — Research Worker

Implement:

```text
daily_deep
intraday_pulse
weekly_deep
manual
```

with:

- retry
- timeout
- partial failure
- idempotency
- run tracking

---

## Phase 5 — Trend Engine

Implement:

```text
growth
velocity
acceleration
persistence
cross-platform signal
```

and Trend Score.

---

## Phase 6 — Topic Engine

V1:

```text
LLM canonicalization
+
deduplication
```

Keep the interface ready for future:

```text
BERTopic
embeddings
clustering
```

---

## Phase 7 — Scoring

Implement:

```text
Trend Score
Viral Score
Commercial Score
Content Opportunity Score
```

Make weights configurable.

Version all scoring models.

---

## Phase 8 — Opportunity Engine

Generate:

```text
topic
why_now
angles
hooks
formats
commercial relevance
recommended products
```

Store results.

---

## Phase 9 — Tenant Personalization

Input:

```text
shared intelligence
+
tenant profile
+
catalog
+
audience
+
objective
```

Output:

```text
tenant-specific content opportunities
```

---

## Phase 10 — API

Implement:

```text
/trends
/topics
/opportunities
/breakouts
```

Use existing FloraOS API conventions.

---

## Phase 11 — Content Agent Integration

Expose a clean internal contract:

```text
Content Opportunity
→ Writer Agent
```

Do not make Writer Agent understand raw trend providers.

---

## Phase 12 — Tests / Observability / Security

Complete all acceptance criteria.

---

# 59. Coding Rules for Claude/Cursor

1. **Inspect before modifying.**
2. Reuse existing `floraos-core` infrastructure.
3. Do not create duplicate databases/caches/queues.
4. Do not create microservices unless the current architecture already requires them.
5. Keep providers behind adapters.
6. Keep scoring logic independent from providers.
7. Keep LLM prompts/versioning separate from data collection.
8. Store raw and normalized data separately where practical.
9. Never fabricate unavailable metrics.
10. Mark stale/partial data explicitly.
11. Use migrations for schema changes.
12. Add tests for every critical path.
13. Do not hard-code tenant-specific logic into the global engine.
14. Keep industry taxonomy configurable.
15. Keep geography configurable.
16. Keep scoring weights configurable.
17. Version scoring and prompt logic.
18. Log research runs and provider failures.
19. Protect all API keys server-side.
20. Document every external dependency and its license/ToS status.
21. Prefer a simple implementation over premature ML.
22. Do not integrate BERTopic/KeyBERT/virality-prediction merely because they are available.
23. Add advanced components only when measurable product/data requirements justify them.

---

# 60. Final Design Principle

The system should follow this rule:

```text
REUSE PROVEN COMPONENTS
        +
OWN THE ARCHITECTURE
        +
OWN THE INTELLIGENCE LAYER
        +
KEEP PROVIDERS REPLACEABLE
        +
VALIDATE OUTPUTS
```

FloraOS does NOT need to reinvent:

- trend collection
- embeddings
- topic modeling
- LLM reasoning
- social metrics

FloraOS DOES need to own:

- market intelligence architecture
- normalized data model
- trend scoring
- viral scoring
- commercial relevance
- content opportunity logic
- tenant personalization
- learning loop
- provider abstraction

---

# 61. The Product Loop

The final product loop is:

```text
             MARKET
               ↓
          DATA SOURCES
               ↓
        MARKET INTELLIGENCE
               ↓
             TRENDS
               ↓
             TOPICS
               ↓
        VIRAL / COMMERCIAL
               ↓
      CONTENT OPPORTUNITIES
               ↓
        TENANT PERSONALIZATION
               ↓
           CONTENT
               ↓
          PUBLISHING
               ↓
           PERFORMANCE
               ↓
            LEARNING
               ↓
      BETTER OPPORTUNITIES
```

The strategic objective is not to build a "trend lookup tool".

It is to build:

> **A reusable Market Intelligence Engine that continuously converts public market signals into actionable content opportunities for every FloraOS tenant.**

---

# 62. Final V1 Definition

If implementation scope must be reduced, the minimum viable system is:

```text
1. Scheduler
2. One Trend Provider
3. Optional fallback/cache
4. PostgreSQL
5. Normalizer
6. Trend scoring
7. LLM topic generation
8. Content opportunity generation
9. Tenant personalization
10. API
```

Everything else is optional until V2/V3.

**Do not delay V1 by implementing future capabilities prematurely.**
