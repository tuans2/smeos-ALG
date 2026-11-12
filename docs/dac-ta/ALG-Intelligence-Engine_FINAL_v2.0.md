# ALG Intelligence Engine — FINAL Product & Technical Specification
## Market Intelligence + Product Intelligence

**Version:** 2.0 Final  
**Status:** Implementation-ready  
**Scope:** Product utility and system foundation. Pricing is intentionally out of scope.

---

## 1. Executive Summary

ALG Intelligence is not a generic trend dashboard.

Its purpose is to transform:

**Evidence → Signals → Trends → Insights → Opportunities → Topics → Actions → Results → Learning**

The system has two primary user-facing modes:

### A. Market Intelligence
Answers:

> **“What is happening in the market, and what should my shop pay attention to?”**

It researches the broader flower market by geography, period, customer, occasion, product type, style, price and content behavior.

### B. Product Intelligence
Answers:

> **“I already have this product. How well does it fit the market, who should I sell it to, how should I position it, and what content should I create?”**

It starts from 1–3 product images, analyzes the product, then compares it with shared market intelligence and current evidence.

Both modes use the same central Intelligence Core.

---

# 2. Product Philosophy

Do not merely report:

> “Pastel flowers are trending.”

Instead provide:

> “Pastel Birthday Bouquet currently has relevant market signals for this audience. Here is the evidence, why it matters, how to position it, and concrete topics you can publish.”

The product must move from:

**Information → Decision → Action**

---

# 3. Core Intelligence Loop

```text
                    EXTERNAL WORLD
                         │
          ┌──────────────┼──────────────┐
          ↓              ↓              ↓
       Market         Social         Visual
       Signals        Signals        Signals
          │              │              │
          └──────────────┼──────────────┘
                         ↓
                 EVIDENCE ENGINE
                         ↓
                SIGNAL NORMALIZER
                         ↓
                    TREND ENGINE
                         ↓
                   INSIGHT ENGINE
                         ↓
              OPPORTUNITY ENGINE
                         ↓
                    TOPIC ENGINE
                         ↓
                PERSONALIZATION
                         ↓
              ┌──────────┴──────────┐
              ↓                     ↓
      MARKET INTELLIGENCE    PRODUCT INTELLIGENCE
              │                     │
              └──────────┬──────────┘
                         ↓
                  CONTENT ACTION
                         ↓
             Image / Video / Publish
                         ↓
                    ANALYTICS
                         ↓
                     LEARNING
                         │
                         └──────→ Intelligence Core
```

---

# 4. Market Intelligence

## Primary question

> **What is happening in the market?**

## Main user

Florist/shop owner/marketing staff who wants to understand what to make, promote or prepare.

## Input

Use prebuilt selections, not free-form prompting:

- Industry
- Geography
- Time period
- Product category
- Flower type
- Style
- Color
- Occasion
- Audience
- Price range
- Business objective
- Content objective
- Trend objective
- Channel

## Output

- Market overview
- Top trends
- Emerging/growing/stable/declining trends
- Audience trends
- Occasion trends
- Product opportunities
- Style/color trends
- Content trends
- Price signals
- Concrete topics
- Visual references
- Article/video references
- Evidence
- Recommended actions

---

# 5. Market Intelligence User Journey

```text
Open Market Intelligence
        ↓
Select Daily / Weekly / Monthly
        ↓
Select Geography
        ↓
Select Focus
        ↓
Load shared intelligence
        ↓
Targeted research only if stale/missing
        ↓
Validate evidence
        ↓
Generate report
        ↓
Show opportunities
        ↓
Show concrete topics
        ↓
User chooses action
```

---

# 6. Market Intelligence Report

## 6.1 Executive Summary

The first screen should answer:

```text
TODAY

3 important opportunities
5 rising trends
12 content topics
5 upcoming occasions
```

The user should understand the situation within seconds.

## 6.2 Trend Lifecycle

Use:

```text
Emerging
   ↓
Growing
   ↓
Peak
   ↓
Stable
   ↓
Declining
```

Do not reduce every trend to “hot/not hot”.

## 6.3 Trend Card

Every trend card should contain:

- Trend name
- Lifecycle
- Geography
- Period
- Why it matters
- Growth/velocity signal
- Relevant audience
- Relevant occasions
- Product implications
- Content implications
- Evidence
- References
- Recommended action

Example:

```text
PASTEL BOUQUETS

Lifecycle: Growing

Why:
Strong current signals across visual and social sources.

Audience:
Women 22–35

Occasions:
Birthday / Anniversary

Opportunity:
Develop pastel birthday concepts.

Evidence:
[Trend signal]
[TikTok]
[Visual references]
[Articles]

[View evidence] [Create topic]
```

---

# 7. Concrete Topic Requirement

The system must never stop at a generic trend statement.

Bad:

> Pastel flowers are trending.

Good:

```text
1. 3 pastel colors that make a birthday bouquet look more elegant
2. 599K birthday bouquet for someone who loves soft colors
3. If she loves pastel, choose this bouquet
4. Why pastel bouquets are getting attention for birthdays
5. 5 pastel bouquet styles customers are looking for
```

Each topic must include:

- Topic title
- Why now
- Target audience
- Content angle
- Hook
- Format
- CTA
- Relevant product
- Evidence
- References
- Recommended channel
- Create Content action

---

# 8. Product Intelligence

## Primary question

> **“This exact product: how should I sell and market it?”**

Product Intelligence is not just image analysis.

Image analysis is the first step.

The final output must connect:

**Product → Market → Audience → Positioning → Opportunity → Topic → Content**

---

# 9. Product Intelligence User Journey

```text
Upload 1–3 product photos
        ↓
AI analyzes product
        ↓
Extract product attributes
        ↓
User confirms / edits attributes
        ↓
Match product against shared Market Intelligence
        ↓
Product Trend Fit
        ↓
Audience analysis
        ↓
Occasion analysis
        ↓
Positioning analysis
        ↓
Competitive context
        ↓
Product improvement suggestions
        ↓
Content angles
        ↓
Concrete topics
        ↓
Evidence + references
        ↓
Content readiness
        ↓
Create Content / Image / Video
```

---

# 10. Product Image Analysis

Identify where possible:

### Product Identity
- Product name
- Product category
- Product type

### Flower Components
- Flower type
- Quantity estimate
- Dominant flowers
- Supporting flowers
- Foliage

### Visual Attributes
- Main colors
- Secondary colors
- Style
- Shape
- Composition
- Size estimate
- Visual mood

### Packaging
- Wrapping material
- Wrapping color
- Ribbon
- Box
- Basket
- Accessories
- Card

### Context
- Likely occasion
- Likely audience
- Emotional intent
- Possible positioning

Every AI-inferred field should carry confidence where practical.

---

# 11. Product Confirmation

Do not silently assume every visual interpretation is correct.

Example:

```text
WE FOUND

Product:
Pastel bouquet

Flowers:
Pink rose
Baby's breath
Eucalyptus

Style:
Pastel / Romantic

Likely occasions:
Birthday / Anniversary
```

User actions:

**Confirm → Edit → Continue**

The normal UX should not require writing prompts.

---

# 12. Product Trend Fit

Compare the product against current market signals.

Example:

| Attribute | Market Signal | Product |
|---|---|---|
| Pastel | Growing | Match |
| Pink | Growing | Match |
| Birthday | Growing | Match |
| Kraft packaging | Stable | Match |
| Romantic style | Growing | Match |

Explain which attributes match and which do not.

Do not show only an unexplained aggregate score.

---

# 13. Product Intelligence Report

## 13.1 Header

```text
PRODUCT INTELLIGENCE

Pink Pastel Birthday Bouquet

Trend Fit: High
Audience Fit: High
Content Fit: High
Evidence: 12 relevant sources
```

## 13.2 Product Analysis

Answer:

> What is this product?

Show:

- Identity
- Components
- Style
- Color
- Packaging
- Occasion
- Confidence

## 13.3 Market Fit

Answer:

> Does this product fit current demand/signals?

Show:

- Trend matches
- Trend mismatches
- Lifecycle
- Evidence
- Freshness
- Confidence

## 13.4 Audience

Answer:

> Who is most likely to respond?

Show:

- Primary audience
- Secondary audience
- Occasions
- Emotional needs

Example:

```text
Primary:
Female 22–35

Secondary:
Male 25–40 buying gifts

Occasions:
Birthday / Anniversary / Proposal

Emotional needs:
Romantic / Sweet / Thoughtful / Celebration
```

Audience must be evidence-backed or clearly labeled as AI inference.

---

# 14. Occasion Intelligence

The same product can have multiple contexts.

```text
Product
  ├── Birthday
  ├── Anniversary
  ├── Valentine's Day
  ├── Proposal
  └── Just Because
```

For each relevant occasion provide:

- Relevance
- Audience
- Content angle
- Recommended topic
- Evidence

---

# 15. Product Positioning

Answer:

> **How should this product be presented to the market?**

Example:

### Birthday Gift
A soft pastel birthday bouquet for someone who loves gentle colors.

### Romantic Gift
A bouquet that expresses affection without saying too much.

### Elegant Gift
A simple, refined bouquet for someone who prefers understated beauty.

The system should explain why a positioning is recommended.

---

# 16. Competitive Context

V1 does not need a full competitor intelligence system.

It should answer:

> **Where does this product sit relative to similar market references?**

Show:

- Similar visual styles
- Similar concepts
- Common packaging
- Common occasions
- Common positioning
- Differentiation opportunities

Example:

```text
COMMON MARKET PATTERN
Pastel + Pink + Kraft

POSSIBLE DIFFERENTIATION
- Premium wrapping
- Personalized message
- Better photography
- Distinctive ribbon
- Delivery experience
```

Link to references where available.

---

# 17. Product Improvement

The system should answer:

> **What should I change?**

Use:

### KEEP
Strong attributes.

### IMPROVE
Attributes that may reduce visual/market fit.

### TEST
Variations worth experimenting with.

Example:

```text
KEEP
✓ Pastel colors
✓ Pink rose
✓ Romantic composition

IMPROVE
⚠ Background
⚠ Wrapping presentation

TEST
🧪 Premium ribbon
🧪 Message card
🧪 Luxury wrapping
```

Action:

**[Create Product Variation]**

---

# 18. Product Content Strategy

Generate content angles from the product and intelligence.

Recommended categories:

- Emotional
- Product showcase
- Educational
- Problem/Solution
- Social trend
- Comparison
- Storytelling
- Behind the scenes
- Price/value
- Occasion
- Customer scenario

Example:

```text
EMOTIONAL
"Some gifts don't need words."

PROBLEM/SOLUTION
"Don't know what to give her for her birthday?"

PRODUCT
"A 599K pastel bouquet for someone who loves soft colors."

EDUCATIONAL
"Why pastel colors make bouquets feel softer."

TREND
"Why pastel bouquets are getting attention again."
```

---

# 19. Product-Specific Topics

Example:

```text
1. 599K birthday bouquet for someone who loves pastel
2. 3 pastel colors that make a bouquet look more elegant
3. If she loves soft colors, choose this bouquet
4. A bouquet that says “I love you” without words
5. Why pastel bouquets work so well for birthdays
6. Pink vs white: which bouquet feels more romantic?
7. What should you buy for a minimalist girlfriend?
8. One bouquet, three ways to express your feelings
9. How to choose a birthday bouquet by personality
10. The softest birthday gift for someone special
```

Every topic must have evidence and a direct action.

---

# 20. Evidence System

## Core rule

Every important claim, trend and topic should have supporting evidence whenever available.

Distinguish:

```text
EVIDENCE
   ↓
OBSERVATION
   ↓
AI INTERPRETATION
   ↓
RECOMMENDATION
```

Never present AI inference as raw fact.

## Evidence Types

### Market
- Search/trend signals
- Market reports
- News
- Search growth
- Marketplaces
- Product signals

### Social
- TikTok
- YouTube
- Instagram
- Facebook
- Reddit where relevant

### Visual
- Product images
- Bouquet examples
- Color palettes
- Packaging
- Photography styles

### Commercial
- Product listings
- Price signals
- Product frequency
- Marketplace activity

---

# 21. Evidence Record

```json
{
  "id": "evidence_001",
  "source": "provider_name",
  "source_type": "social",
  "platform": "tiktok",
  "title": "Example title",
  "url": "https://...",
  "thumbnail_url": "https://...",
  "published_at": "...",
  "captured_at": "...",
  "author": "...",
  "external_id": "...",
  "engagement": {
    "views": 0,
    "likes": 0,
    "comments": 0,
    "shares": 0
  },
  "evidence_type": "visual",
  "relevance_score": 0.91,
  "metadata": {}
}
```

Never fabricate missing metrics.

Evidence should be attached directly to the trend/topic/recommendation.

## 21.1 Dual Video Evidence Architecture (TikTok + YouTube)

Every opportunity or trend item presented in the UI MUST display **dual video evidence thumbnails** from verified social platforms:
1. **TikTok Evidence (Vertical 9:16)**:
   - Video thumbnail with dark gradient overlay
   - Platform badge (`TikTok` neon badge)
   - Play icon overlay for visual affordance
   - Real creator handle (e.g. `@hoatuoituongan`, `@queenflowers`, `@tiemhoanangxuan`)
   - Real engagement metrics (e.g. `42.6k tim`, `28.4k tim`)
   - Interactive link opening the verified TikTok video in a new tab (`window.open(url, "_blank")`)
2. **YouTube Evidence (Horizontal 16:9)**:
   - Video thumbnail with dark gradient overlay
   - Platform badge (`YT` red badge)
   - Play icon overlay
   - Real YouTube creator channel handle
   - Real views metrics
   - Interactive link opening the verified YouTube video in a new tab

Both thumbnails sit side-by-side on each card to guarantee tangible, transparent market proof for florist merchants.
Centralized implementation lives in `src/components/market-intelligence/video-evidence-catalog.ts` and `opportunity-illustration.ts`.

## 21.2 Raw Keyword Sanitization Rule (Anti-Keyword-Dumping)

Under no circumstances should raw search query dumps (e.g. `Hoa 20/10, Bó hoa tốt nghiệp hướng dương, Hoa cưới mùa thu, Hoa cưới tone cam cháy...`) be displayed on user-facing UI elements:
- **Strictly Prohibited**: Rendering comma-separated keyword dumps inside tag badges (`<Tag />`), card headers, or script quotes.
- **Sanitization Pipeline**:
  - **Headlines**: Processed via `getOpportunityHeadline(item)` to generate polished marketing titles (e.g. `BST Hoa 20/10 thanh lịch dẫn đầu xu hướng năm nay`).
  - **Hooks & Scripts**: Processed via `formatCleanHook(hook)` to transform raw query interpolations into persuasive, natural florist marketing copy.
  - **Database Sanitation**: The `topics` table must be sanitized to eliminate duplicate aggregate keyword strings, mapping them back to canonical topic entities.

---

# 22. Evidence Confidence

### High
Multiple independent evidence types or strong time-series evidence.

### Medium
One strong source or multiple weaker signals.

### Low
Single weak signal or primarily AI inference.

Low-confidence items must be labeled as hypotheses.

---

# 23. Reference Library

Supported reference types:

- Article
- Video
- Image
- Trend chart
- Product listing
- Social post
- Search result

UI actions:

**[View Source]**

**[View Video]**

**[View Image]**

Use links/metadata and permitted thumbnails rather than unnecessarily copying protected content.

---

# 24. Opportunity Engine

The Opportunity Engine converts intelligence into practical actions.

It answers:

> **What is worth doing now?**

Inputs:

- Trend strength
- Lifecycle
- Audience fit
- Product fit
- Commercial relevance
- Content relevance
- Freshness
- Evidence strength
- Tenant fit
- Market context

Output:

```text
OPPORTUNITY

Pastel Birthday Bouquet

Why:
Strong trend + audience + product fit.

Do next:
Create product concept
Create 3 content pieces
Test visual variation
```

---

# 25. Daily Opportunity View

Recommended home experience:

```text
TODAY'S INTELLIGENCE

🔥 3 opportunities
📈 5 trends
💡 12 topics
🌸 3 product ideas
📅 5 upcoming occasions
👀 20 useful references
```

Every item should lead to an action.

---

# 26. Product Content Readiness

Evaluate:

```text
PRODUCT READINESS

Product recognition     ✓
Trend fit               ✓
Audience defined        ✓
Positioning             ✓
Content angles          ✓
Topics                  ✓
Visual quality          ⚠
Video potential         ✓
```

If visual quality is weak:

> The product is suitable for content, but the current photo may reduce content quality.

Action:

**[Enhance Image]**

If ready:

**[Create Content]**

---

# 27. Input Criteria System

Criteria must be data-driven.

```json
{
  "key": "audience",
  "label": "Khách hàng",
  "options": [],
  "default": [],
  "allow_multiple": true,
  "allow_custom": false,
  "dependency": null,
  "visibility": "market_and_product"
}
```

Each criterion should support:

- label
- options
- default
- multiple selection
- optional custom value
- dependency
- visibility

Use smart defaults.

For Product Intelligence:

```text
Image analysis
      ↓
Suggested attributes
      ↓
Suggested criteria
      ↓
User confirms
```

---

# 28. Intelligence Template System

Reports must be configurable rather than hardcoded.

Recommended templates:

- Market Trend Report
- Daily Trend Brief
- Weekly Market Report
- Monthly Market Report
- Product Trend Analysis
- Product Content Strategy
- Audience Trend Analysis
- Topic Discovery
- Content Opportunity Report

Template pipeline:

```text
Input Schema
      ↓
Research Strategy
      ↓
Analysis Rules
      ↓
Output Schema
      ↓
Presentation Template
```

---

# 29. Shared Intelligence Architecture

Do not research the same market independently for every tenant.

Use:

```text
GLOBAL INTELLIGENCE
        ↓
INDUSTRY INTELLIGENCE
        ↓
TENANT INTELLIGENCE
        ↓
PRODUCT INTELLIGENCE
```

Tenant-private information must never leak into shared/public intelligence.

---

# 30. Research Scheduling

Recommended:

### Daily Deep Research
Around 06:00 local time, configurable.

### Intraday Pulse
Every 2–4 hours for breakout/anomaly signals.

### Weekly Analysis
7D / 30D / 90D / seasonality.

### Monthly Analysis
Long-term trends, audience shifts, product patterns.

Store time series, not only snapshots.

---

# 31. Research vs Report Generation

Separate research from report rendering.

```text
Research Core
      ↓
Shared Intelligence Database
      ↓
Market Report
      ↓
Product Report
      ↓
Tenant Recommendations
```

Opening a report should not trigger a full research run.

Only perform targeted supplemental research when data is stale or missing.

---

# 32. Provider Architecture

Never depend on one provider.

Use adapters:

```text
TrendProvider
ContentSignalProvider
VisualEvidenceProvider
MarketDataProvider
```

Architecture:

```text
Provider API
     ↓
Adapter
     ↓
ALG Normalized Schema
     ↓
Intelligence Core
```

Business logic must never depend directly on provider-specific SDK schemas.

---

# 33. Provider Resilience

```text
Primary Provider
      ↓
Retry
      ↓
Fallback Provider
      ↓
Cache
      ↓
Graceful Degradation
```

Track:

- Availability
- Latency
- Error rate
- Rate limits
- Freshness
- Completeness

Research run states:

- success
- partial_success
- failure

Partial provider failure must not destroy the whole run.

---

# 34. Scoring

Keep scores separate:

- Trend Score
- Audience Fit
- Product Fit
- Commercial Potential
- Content Potential
- Evidence Strength
- Freshness
- Competition/Market Saturation
- Opportunity Score

Do not hide everything inside one unexplained score.

Example:

```text
Trend            90
Audience Fit     88
Product Fit      94
Content Fit      91
Evidence         86
Commercial       82
```

Aggregate scores must be versioned:

```text
model_version = "opportunity_v1"
```

Missing metrics must reduce confidence rather than be fabricated.

---

# 35. Logical Database Model

Core tables:

```text
market_sources
trend_signals
trend_timeseries

evidence_items
topic_evidence

insights
topics
topic_scores
content_opportunities

industry_taxonomy
geographies

intelligence_criteria
intelligence_options

intelligence_templates
template_sections
template_criteria

research_runs
provider_health

report_instances
report_items

tenant_topic_recommendations
saved_topics
```

Product layer:

```text
products
product_images
product_attributes
product_analysis_runs
product_market_matches
product_audience_matches
product_positioning
product_improvement_suggestions
product_content_angles
```

Use JSONB for flexible AI output where appropriate, while keeping high-value searchable fields normalized.

---

# 36. Content Opportunity Model

Recommended fields:

```text
id
topic_id
industry_id
geography_id
tenant_id
product_id
audience
occasion
opportunity_summary
content_angles_json
recommended_formats_json
recommended_hooks_json
recommended_products_json

trend_score
audience_fit_score
product_fit_score
viral_score
commercial_score
content_score
evidence_score
content_opportunity_score

confidence
model_version
expires_at
created_at
updated_at
```

---

# 37. API

## User APIs

```text
GET  /api/intelligence/criteria
GET  /api/intelligence/templates

POST /api/intelligence/reports/market
POST /api/intelligence/reports/product

GET  /api/intelligence/reports/:id

GET  /api/intelligence/trends
GET  /api/intelligence/topics
GET  /api/intelligence/opportunities

GET  /api/intelligence/topics/:id

POST /api/intelligence/topics/:id/create-content
```

## Internal APIs

```text
POST /internal/intelligence/research/daily
POST /internal/intelligence/research/pulse
POST /internal/intelligence/research/weekly

GET  /internal/intelligence/runs
GET  /internal/intelligence/providers/health
```

---

# 38. Product-to-Content Contract

Content Agent must consume normalized intelligence, not raw provider data.

```json
{
  "product": {},
  "audience": {},
  "occasion": {},
  "positioning": {},
  "topic": {},
  "angle": {},
  "format": {},
  "hook": {},
  "cta": {},
  "evidence": [],
  "references": []
}
```

This keeps Content Agent independent from research providers.

---

# 39. Future Agent Flow

```text
Market Intelligence
        ↓
Opportunity
        ↓
Topic
        ↓
Content Agent
        ↓
Image Agent
        ↓
Video Agent
        ↓
QA Agent
        ↓
Publishing Agent
        ↓
Analytics Agent
        ↓
Learning Agent
```

Product Intelligence enters the same pipeline:

```text
Product Upload
      ↓
Product Intelligence
      ↓
Opportunity
      ↓
Topic
      ↓
Content
```

---

# 40. Learning Loop

Published content performance should feed back into Intelligence.

Example:

```text
Market Trend:
Pastel
      ↓
Tenant Content:
10 posts
      ↓
Performance:
Views +72%
Engagement +43%
Orders +28%
      ↓
Tenant Intelligence:
Pastel has strong fit for this tenant
```

This eventually enables:

**Market Intelligence → Personalized Intelligence**

---

# 41. Intelligence Graph

Long-term relationships:

```text
Trend
 ↓
Audience
 ↓
Occasion
 ↓
Product
 ↓
Style
 ↓
Color
 ↓
Topic
 ↓
Content
 ↓
Channel
 ↓
Performance
 ↓
Revenue
```

Do not build a dedicated graph database in V1. Relational IDs + JSONB are sufficient.

---

# 42. UX Principles

1. User selects; user does not need to prompt.
2. Show evidence, not unsupported claims.
3. Show actions, not only information.
4. Summary first; details second.
5. Visual examples are essential for florist users.
6. Every major intelligence item should answer:

```text
WHY
WHAT
EVIDENCE
ACTION
```

---

# 43. Market Intelligence UI

```text
MARKET INTELLIGENCE & PRODUCT INTELLIGENCE

Header: Tiêu chí nghiên cứu (Ngành hoa, Địa lý, Chu kỳ Pulse, Cấu hình SaaS)
[Quản trị tiêu chí SaaS] [Chu kỳ cập nhật: Tự động mỗi 12 giờ]

──────────────────────────────────────────────────────────────────────────
4 TAB ĐIỀU HƯỚNG TỔNG THỂ (TOP-LEVEL FILTER CARDS):

[🔥 Cơ hội quan trọng]   [📈 Xu hướng bứt phá]   [💡 Chủ đề nên làm]   [📅 Mùa vụ & Dịp tới]
  Score ≥ 60               Viral & Surging          Có sẵn Hook & Mẫu     Sắp diễn ra
──────────────────────────────────────────────────────────────────────────

CẤU TRÚC THẺ KẾT QUẢ VỚI DẪN CHỨNG VIDEO KÉP (DUAL VIDEO EVIDENCE CARD):

┌────────────────────────────────────────────────────────────────────────┐
│ [THUMBNAIL KÉP]       [THÔNG TIN XU HƯỚNG & HÀNH ĐỘNG]                │
│                                                                        │
│ ┌─────────┐┌─────────┐ [Đang tăng]  [⚡ 42.6k tim • TikTok]            │
│ │ [TikTok]││ [YT]    │                                                 │
│ │  ▶ Play ││  ▶ Play │ Tiêu đề: BST Hoa 20/10 thanh lịch dẫn đầu xu... │
│ │ @creator││ @channel│ "Kịch bản: Bật mí bí quyết chọn hoa chuẩn gu..."│
│ └─────────┘└─────────┘                                                 │
│                        [Xem chi tiết →]    [📋 Sao chép] [🎬 Tạo Video]│
└────────────────────────────────────────────────────────────────────────┘

QUY TẮC HIỂN THỊ:
1. Cấm hiển thị tag chứa chuỗi từ khóa thô nối phẩy.
2. Hai thumbnail TikTok & YouTube có thể nhấp trực tiếp để mở video kiểm chứng.
3. Nút [Tạo Video] deep link sang /video?prompt=... với kịch bản đã làm sạch.
```

---

# 44. Product Intelligence UI

```text
PRODUCT INTELLIGENCE

[Product image]

Pink Pastel Birthday Bouquet

Trend Fit      HIGH
Audience Fit   HIGH
Content Fit    HIGH

────────────────────────

01 WHAT IS THIS PRODUCT?

02 DOES IT FIT THE MARKET?

03 WHO SHOULD BUY IT?

04 FOR WHICH OCCASIONS?

05 HOW SHOULD IT BE POSITIONED?

06 WHERE DOES IT SIT IN THE MARKET?

07 WHAT SHOULD BE IMPROVED?

08 WHAT SHOULD WE TALK ABOUT?

09 TOP 10 CONTENT TOPICS

10 EVIDENCE & REFERENCES

────────────────────────

[Create Content]
[Create Image]
[Create Video]
[Create Product Variation]
```

---

# 45. V1 Scope

## Must Have

### Market Intelligence

- Criteria selection
- Daily/weekly report
- Trend detection
- Evidence
- Trend lifecycle
- Concrete topics
- Reference links
- Opportunity recommendations

### Product Intelligence

- Upload 1–3 images
- Product image analysis
- Attribute confirmation
- Product trend fit
- Audience
- Occasion
- Positioning
- Product improvement
- Content angles
- Concrete topics
- Evidence
- Content readiness
- Create Content handoff

### Platform

- Shared intelligence
- Multi-tenant separation
- Provider abstraction
- Research runs
- Scheduler
- Normalization
- Basic scoring
- API
- Observability

---

# 46. Do Not Over-Engineer V1

Do not introduce unless clearly required:

- Microservice explosion
- Dedicated vector database
- Complex knowledge graph
- BERTopic
- KeyBERT
- Custom virality ML
- Full competitor intelligence
- Complex forecasting
- Autonomous publishing without QA
- Dozens of external providers

V1 principle:

> **Simple architecture, strong evidence, useful output, clear action.**

---

# 47. V2

Add:

- Semantic deduplication
- Embeddings
- More social sources
- Better visual similarity
- Topic clustering
- Local intelligence
- Trend calendar
- Personalized recommendations
- Product variation generation
- More advanced competitive context

---

# 48. V3

Add:

- Virality prediction
- Tenant-specific recommendation models
- Forecasting
- Performance-based topic ranking
- Automated experiment selection
- Advanced learning loop
- Autonomous marketing workflows

---

# 49. Commercial Readiness — Product Utility, Not Pricing

This specification intentionally does **not** define pricing, credits or subscription plans.

Commercial readiness here means:

1. User understands the output.
2. User sees evidence.
3. User receives practical recommendations.
4. User can act immediately.
5. The action connects to the next ALG module.
6. The system becomes more useful after analytics are collected.

Core loop:

```text
RESEARCH
   ↓
UNDERSTAND
   ↓
DECIDE
   ↓
CREATE
   ↓
PUBLISH
   ↓
MEASURE
   ↓
LEARN
```

---

# 50. Acceptance Criteria — Market Intelligence

Implementation is successful when:

- User can generate a report using selections rather than prompts.
- Report supports daily/weekly/monthly.
- Report can be scoped by geography.
- Every major trend has evidence where available.
- Evidence is clickable/viewable.
- Trend lifecycle is visible.
- Report produces concrete topics.
- Topics have evidence.
- Topics can be handed to Content Agent.
- Recommendations are actionable.
- Shared intelligence can be reused across tenants.
- Provider failure produces partial results rather than total failure.
- Provider-specific schemas do not leak into business logic.

---

# 51. Acceptance Criteria — Product Intelligence

Implementation is successful when:

- User can upload 1–3 product images.
- System identifies useful product attributes.
- User can confirm/edit attributes.
- Product is matched against current market intelligence.
- System identifies relevant trends.
- System identifies target audiences.
- System identifies relevant occasions.
- System provides positioning suggestions.
- System provides market/competitive context.
- System identifies possible product improvements.
- System generates concrete product-specific topics.
- Important recommendations have evidence where available.
- User can inspect references.
- User can send a selected topic to Content Agent.
- Product Intelligence does not require a full new market research run for every product.

---

# 52. Final Product Definition

ALG Intelligence is:

> **An intelligence layer that understands what is happening in the market, understands the user's product, connects the two, and converts the result into concrete marketing actions.**

The two primary questions are:

### Market Intelligence

> **“What should my business pay attention to?”**

### Product Intelligence

> **“What should I do with this product?”**

Together:

```text
MARKET
  ↓
WHAT IS HAPPENING?
  ↓
WHAT IS THE OPPORTUNITY?
  ↓
MY PRODUCT
  ↓
DOES IT FIT?
  ↓
WHO IS IT FOR?
  ↓
HOW SHOULD I POSITION IT?
  ↓
WHAT SHOULD I SAY?
  ↓
WHICH TOPIC?
  ↓
CREATE CONTENT
  ↓
PUBLISH
  ↓
MEASURE
  ↓
LEARN
```

This specification is the intended foundation for ALG's later autonomous marketing system.
