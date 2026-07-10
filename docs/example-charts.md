# M Chart example charts — pickle data library

This document accompanies a library of 19 example charts (one per chart type the plugin supports) using real-world pickle / fermented-vegetable data. Each section below shows the recommended chart configuration, the data laid out as a table you can paste straight into the Jspreadsheet meta box, and the source(s) the data is drawn from.

The canonical machine-readable copies of each chart live at [`tests/fixtures/charts/pickle-<slug>.json`](../tests/fixtures/charts/). A pre-built WordPress import file (`pickle-charts.wxr.xml`) is also available under [`example-charts/`](../example-charts/) — import it via **Tools → Import → WordPress** to get all 19 charts as drafts on any WP install.

## How to read this document

Every chart in this library carries a **subtitle that surfaces any data caveats directly on the chart itself** (rounding, interpolation, source synthesis, normalization, etc.) — so a reader sees the caveat without leaving the chart. The full citation including accessed-date appears in the per-chart "Sources" block below. All accessed dates are 2026-05-12 unless otherwise noted.

Where a number was interpolated between source-confirmed anchor years, the subtitle says so. Where data was derived (e.g. radar sensory ratings calibrated from cited qualitative profiles), the subtitle says so. No values were silently fabricated.

---

## Cultural coverage

A quick map of which traditions show up where:

| Region / tradition | Charts |
|---|---|
| **United States** | line, bar, stacked-bar, radar-area, violin, polar, boxplot, treemap |
| **Korea** | spline, area, doughnut, radar, radar-area, scatter, boxplot, euler (kimchi) |
| **China** | column, pie, radar, radar-area, boxplot |
| **Japan** | radar |
| **India** | radar |
| **Mediterranean** | treemap (Turkey, Egypt, Spain, Algeria, Greece, Morocco, Syria, Italy) |
| **Europe** | stacked-column (Korean exports → NL, but EU-bound), radar-area (sauerkraut), euler (sauerkraut) |
| **Americas (non-US)** | treemap (Argentina, Peru) |
| **Global (FAOSTAT)** | venn (top producers of cucumbers, cabbages, chillies) |

---

## 1. Line — Cucumber yield by top producer country, 2014-2023

**Chart type:** `line` - **parse_in:** `rows` - **single sheet, multi-series (LABELS_BOTH)** - **shared tooltip**

Per-hectare cucumber yield reflects whether production is greenhouse-intensive or open-field. Spain's Almería greenhouses produce roughly 6–7× what Russia's open-field operations manage in the same year. This chart uses the standard multi-series single-sheet shape per [the docs](https://docs.mch.art/guide/creating-a-chart.html): top-left cell empty, top row = x-axis labels (years), left column = series names (countries).

|         | 2014 | 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 |
|---|---|---|---|---|---|---|---|---|---|---|
| Spain         | 67 | 69 | 71 | 73 | 76 | 78 | 80 | 82 | 85 | 87 |
| China         | 49 | 50 | 52 | 54 | 55 | 57 | 58 | 59 | 60 | 61 |
| United States | 29 | 30 | 28 | 31 | 30 | 32 | 31 | 30 | 32 | 33 |
| Russia        | 11 | 11 | 12 | 12 | 13 | 13 | 14 | 13 | 14 | 14 |

The y-axis floor is intentionally left at 0 — Russia at 11 t/ha is still visible at ~12% of axis height and the magnitude gap between greenhouse and open-field producers is the story.

**Sources:**
- [FAOSTAT — Crops and Livestock Products (cucumbers and gherkins, yield column)](https://www.fao.org/faostat/en/#data/QCL) — primary
- [Wikipedia — List of countries by cucumber production](https://en.wikipedia.org/wiki/List_of_countries_by_cucumber_production) — cross-reference for absolute production figures

**Caveat:** Per-year values calibrated from FAOSTAT's typical per-country yield ranges with realistic year-to-year noise. Relative magnitudes (Spain ≫ China ≫ USA ≫ Russia) and the upward / flat trends are anchored in FAOSTAT data. For point-perfect values, query FAOSTAT's QCL dataset directly with the Yield column.

---

## 2. Spline — Per-capita kimchi consumption in Korea

**Chart type:** `spline` - **parse_in:** `rows` - **single sheet** - **shared tooltip**

Per-capita kimchi consumption in Korea has been declining steadily as younger Koreans shift toward westernized diets. The KNHANES survey documents a 27.6 g/day decline between 2005 and 2015 alone.

| Year | Daily consumption (grams) |
|---|---|
| 2005 | 100 |
| 2008 | 92 |
| 2010 | 87 |
| 2013 | 80 |
| 2015 | 72 |
| 2017 | 70 |
| 2020 | 65 |
| 2023 | 60 |

(simple two-column format — single-series. Series name in legend comes from `set_names[0]`.)

**Sources:**
- [Shifts in Kimchi Consumption between 2005 and 2015 by Region and Income Level — KJCN 2017](https://kjcn.or.kr/journal/view.php?doi=10.5720/kjcn.2017.22.2.145) — primary
- [Analysis of Kimchi, vegetable and fruit consumption trends among Korean adults (KNHANES 1998-2012) — PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC4819130/)
- [KOSIS — Korean Statistical Information Service](https://kosis.kr/eng/)

**Caveat:** Anchor years 2005, 2015 from cited surveys; intermediate years interpolated. 2017+ figures reflect the documented continuing decline.

---

## 3. Area — South Korean kimchi exports (USD)

**Chart type:** `area` - **parse_in:** `rows` - **single sheet**

Korean kimchi exports reached an all-time high in 2023, growing ~55% from 2018. The 2020 jump (37.6% YoY) coincided with the pandemic-era surge in interest in fermented foods.

| Year | Exports (USD) |
|---|---|
| 2017 | 85000000 |
| 2018 | 97000000 |
| 2019 | 99000000 |
| 2020 | 133000000 |
| 2021 | 141000000 |
| 2022 | 141000000 |
| 2023 | 156000000 |

(simple two-column format — single-series.)

**Sources:**
- [Korea International Trade Association (KITA)](https://www.kita.org/) — primary
- [KITA monthly trade reports](https://kita.org/kitaTradeReport/kitaTradeReport/kitaTradeReportList.do)
- [Statista — South Korea kimchi export value 2023 (cites KITA)](https://www.statista.com/statistics/1199251/south-korea-kimchi-export-value/) — confirmation of $155.6M 2023 figure
- [Korea Herald — Korea's kimchi exports reach all-time high in 2023](https://m.koreaherald.com/article/3308572)

**Caveat:** Confirmed anchors at 2018 ($97M), 2020 (~$133M from 37.6% jump), 2022 ($140.82M), 2023 ($155.6M). 2017, 2019, 2021 interpolated from the documented growth trend.

---

## 4. Column — Top 10 cucumber-producing countries (2022)

**Chart type:** `column` - **parse_in:** `rows` - **single sheet** - **`data_point_colors: true`**

China dominates global cucumber production at ~81% of the world total. The disparity between China and the #2 producer (Turkey, ~2M tonnes) is itself the story this chart tells.

| Country | Production (tonnes) |
|---|---|
| China | 77260000 |
| Turkey | 1940000 |
| Russia | 1640000 |
| Mexico | 1080000 |
| Uzbekistan | 900000 |
| Ukraine | 830000 |
| Spain | 770000 |
| United States | 600000 |
| Kazakhstan | 570000 |
| Japan | 550000 |

(simple two-column format — no header row. With `data_point_colors: true`, each bar is its own colored data point rather than a single labeled series.)

**Sources:**
- [FAOSTAT — Crops and Livestock Products](https://www.fao.org/faostat/en/#data/QCL) — primary
- [Wikipedia — List of countries by cucumber production](https://en.wikipedia.org/wiki/List_of_countries_by_cucumber_production) — cites FAOSTAT 2022 figures

**Caveat:** Figures rounded to nearest 0.01M tonnes. All ten figures confirmed from cited Wikipedia/FAOSTAT table.

---

## 5. Stacked Column — Korean kimchi exports by destination (2018–2023)

**Chart type:** `stacked-column` - **parse_in:** `rows` - **single sheet**

Japan has historically been the largest destination for Korean kimchi exports, but the United States has been growing rapidly — by 2023 it had nearly closed the gap.

| Year | Japan | US | Netherlands | Australia | Others |
|---|---|---|---|---|---|
| 2018 | 50000000 | 15000000 |  8000000 | 4000000 | 20000000 |
| 2019 | 51000000 | 16000000 |  8000000 | 4000000 | 20000000 |
| 2020 | 66000000 | 25000000 | 10000000 | 5000000 | 27000000 |
| 2021 | 63000000 | 30000000 | 11000000 | 6000000 | 31000000 |
| 2022 | 61000000 | 30000000 | 12000000 | 6000000 | 32000000 |
| 2023 | 60000000 | 40000000 | 14000000 | 7000000 | 35000000 |

(values in USD; Chart.js auto-formats axis ticks as `60M`, etc.)

**Sources:**
- [Korea International Trade Association (KITA)](https://www.kita.org/) — primary
- [Statista — Kimchi export value by country 2022 (cites KITA)](https://www.statista.com/statistics/1199275/south-korea-kimchi-export-value-by-country/) — confirms Japan $61M in 2022

**Caveat:** Yearly totals from KITA-cited summaries. Destination breakdown is approximated from KITA category data; exact per-destination values per year are not all directly published.

---

## 6. Bar — Sodium content of signature pickles (mg per 100g)

**Chart type:** `bar` - **parse_in:** `rows` - **single sheet** - **`data_point_colors: true`**

Sodium content varies dramatically across pickle traditions. Chinese zha cai (pickled mustard tuber) tops the charts; sweet pickles sit at the low end. Useful for comparing options at a glance.

| Pickle | Sodium (mg/100g) |
|---|---|
| Zha cai (Chinese pickled mustard) | 3700 |
| Gari (Japanese pickled ginger) | 1300 |
| Dill pickle (US) | 1100 |
| Olives (table) | 730 |
| Sauerkraut (German-style) | 660 |
| Đồ chua (Vietnamese pickled daikon) | 600 |
| Sweet gherkin (UK) | 570 |
| Kimchi (Korean) | 500 |
| Bread-and-butter pickle (US) | 470 |
| Sweet pickle (US) | 460 |

(simple two-column format — no header row. With `data_point_colors: true`, each bar is its own colored data point rather than a single labeled series.)

**Sources:**
- [USDA FoodData Central](https://fdc.nal.usda.gov/) — primary for dill, sweet, B&B, kimchi, sauerkraut, olives
- [USDA FDC — pickle search](https://fdc.nal.usda.gov/food-search?query=pickle%20dill)
- [USDA FDC — kimchi search](https://fdc.nal.usda.gov/food-search?query=kimchi)

**Caveat:** Per-100g typical values; figures rounded to nearest 10 mg. Non-US varieties (zha cai, gari, đồ chua) supplemented from regional nutritional databases since USDA FDC coverage is US-centric.

---

## 7. Stacked Bar — US pickle product mix by retail brand

**Chart type:** `stacked-bar` - **parse_in:** `rows` - **single sheet**

Top US pickle brands and roughly how their product lines split across types. Vlasic and Mt. Olive have the broadest portfolios; Claussen leans heavily into refrigerated dill.

| Brand | Dill | Sweet | B&B | Sour | Gherkin | Kosher |
|---|---|---|---|---|---|---|
| Vlasic | 35 | 20 | 20 | 10 | 10 | 5 |
| Mt. Olive | 30 | 25 | 20 | 10 | 10 | 5 |
| Claussen | 50 | 10 | 10 | 10 | 10 | 10 |
| Bay Valley | 35 | 20 | 25 | 5 | 10 | 5 |
| Best Maid | 25 | 30 | 25 | 10 | 5 | 5 |

(values are % of each brand's product mix)

**Sources:**
- [Grand View Research — Packed Pickles Market](https://www.grandviewresearch.com/industry-analysis/packed-pickles-market) — primary
- [Mordor Intelligence — Pickles and Pickle Products](https://www.mordorintelligence.com/industry-reports/pickles-and-pickle-products-market)

**Caveat:** Category-level shares from cited market reports. Per-brand attribution is **representative** — exact per-brand SKU breakdowns are not in the open market-report summaries. The chart's subtitle reflects this.

---

## 8. Pie — Chinese preserved-vegetable industry by category (output value)

**Chart type:** `pie` - **parse_in:** `rows` - **single sheet**

China's preserved-vegetable industry is large and regionally diverse. Sichuan pao cai alone is a 33-billion-yuan industry; Fuling-style zha cai (mostly produced in Chongqing) adds another 9B yuan.

| Category | Output value |
|---|---|
| Sichuan pao cai (泡菜) | 33 B CNY |
| Other regional pao cai | 14 B CNY |
| Other pickled vegetables | 10 B CNY |
| Fuling zha cai (榨菜) | 9 B CNY |
| Northeast suan cai (酸菜) | 8 B CNY |
| Mei cai & preserved mustard | 5 B CNY |

(simple two-column format — no header row. Pie/doughnut/polar are all single-series axis-less charts and use this layout; the cell-level suffix `" B CNY"` is preserved through the parser and surfaces in tooltips)

**Sources:**
- [Wikipedia — Pao cai (cites 33B yuan / 70.21% Sichuan figure)](https://en.wikipedia.org/wiki/Pao_cai) — primary for Sichuan pao cai
- [Wikipedia — Zha cai](https://en.wikipedia.org/wiki/Zha_cai)
- [ANSI Blog — ISO 24220:2020 standard for pao cai](https://blog.ansi.org/ansi/iso-24220-2020-pao-cai/) — cites Sichuan industry data
- [China Daily — Fuling 'zhacai' (2.78M tonnes mustard tubers, 1.42M tonnes pickled output, >70% of national total)](https://www.chinadaily.com.cn/a/201903/27/WS5c9b0e29a3104842260b2dcd_2.html)
- [China Daily — Chongqing mustard crop (2024 export figures)](https://www.chinadaily.com.cn/a/202412/04/WS674fb220a310f1265a1d0f2e.html)
- [ChinaFoodIngredients — The Growth of Zhacai](https://chinafoodingredients.com/2014/05/04/the-most-representative-chinese-pickle-zhacai/)

**Caveat:** Sichuan pao cai (33B), Fuling zha cai (9B) are anchored values from cited 2017–2018 reports. "Other" categories approximated to fill the 40B+ yuan total pao cai industry referenced in the Wikipedia article.

---

## 9. Doughnut — Kimchi varieties by share of consumption

**Chart type:** `doughnut` - **parse_in:** `rows` - **single sheet**

Baechu (napa cabbage) kimchi dominates the Korean market at over 70%. The remaining ~30% is split across radish, cucumber, and leafier varieties.

| Variety | Share |
|---|---|
| Baechu (napa cabbage) | 70% |
| Kkakdugi (cubed radish) | 15% |
| Chonggak (ponytail radish) | 5% |
| Oi-sobagi (stuffed cucumber) | 3% |
| Yeolmu (young radish) | 3% |
| Other (pa, gat, dongchimi, etc.) | 4% |

(simple two-column format — no header row, same as pie. Cell suffix `"%"` is extracted by the parser and rendered in tooltips)

**Sources:**
- [World Institute of Kimchi (WiKim) — Research Library](https://www.wikim.re.kr/menu.es?mid=a20501000000) — primary
- [Wikipedia — Kimchi](https://en.wikipedia.org/wiki/Kimchi) — cites WiKim "baechu is ~70% of marketed kimchi"
- [Analysis of Kimchi consumption trends — KNHANES PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC4819130/)

**Caveat:** Baechu (~70%) and radish-group (~20% total) anchored from cited WiKim/Wikipedia figures. Sub-breakdown of the radish group (kkakdugi vs chonggak) approximated from household-preparation preference rankings.

---

## 10. Scatter — Fermentation time vs final pH (4 pickle types)

**Chart type:** `scatter` - **parse_in:** `rows` - **multi-sheet (4 sheets)**

How fast each pickle tradition's fermentation drops the pH — and where each plateaus. Dill pickle and sauerkraut go furthest acidic; kimchi and pao cai stop higher.

**Sheet 1 — Kimchi (15°C):** Day 0 → 5.6; Day 1 → 5.4; Day 3 → 4.7; Day 5 → 4.4; Day 7 → 4.3; Day 14 → 3.9; Day 21 → 3.85

**Sheet 2 — Sauerkraut:** Day 0 → 6.2; Day 2 → 5.5; Day 5 → 4.2; Day 10 → 3.6; Day 14 → 3.4; Day 21 → 3.3

**Sheet 3 — Dill pickle (lacto):** Day 0 → 5.5; Day 1 → 5.0; Day 3 → 4.0; Day 5 → 3.6; Day 7 → 3.5; Day 14 → 3.3

**Sheet 4 — Pao cai (Sichuan):** Day 0 → 5.4; Day 1 → 4.9; Day 3 → 4.1; Day 5 → 3.9; Day 7 → 3.8; Day 14 → 3.7

**Sources:**
- [Effect of Fermentation Conditions on Functional Quality of Napa Cabbage Kimchi — PMC 12385461 (2025)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12385461/) — primary kimchi anchor (5.57 → 4.36 → 3.89)
- [Effect of Fermentation Duration on the Quality Changes of Godulbaegi Kimchi — PMC 8997386 (2022)](https://pmc.ncbi.nlm.nih.gov/articles/PMC8997386/)
- [Kimchi: Spicy Science for the Undergraduate Microbiology Laboratory — JMBE](https://journals.asm.org/doi/10.1128/jmbe.v15i2.695)
- [Metatranscriptomics of Sichuan Paocai fermentation — ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0740002020301623)

**Caveat:** Per-day pH values are synthesized from per-study mean trajectories cited above. The kimchi 15°C series anchors at the PMC 12385461 figures (Day 0 = 5.57, optimal at day 3 ≈ 4.36, excessive at day 14 ≈ 3.89); other types follow comparable curves from cited literature.

---

## 11. Bubble — Cucumber consumption × production × exports (2022)

**Chart type:** `bubble` - **parse_in:** `rows` - **single sheet**

Three variables per country: X = per-capita consumption (kg/year), Y = per-capita production (kg/year), bubble radius = export volume. Mexico's huge export bubble despite low consumption reflects its role as the US's primary import source; China is a dot near the upper-right (massive consumption AND production) but with modest per-capita exports.

| Country | Consumption (kg/yr) | Production (kg/yr) | Export volume |
|---|---|---|---|
| China | 55 | 55 | 80 |
| Turkey | 32 | 23 | 100 |
| Russia | 12 | 11 | 5 |
| Mexico | 8 | 8 | 500 |
| Spain | 15 | 16 | 200 |
| Iran | 26 | 26 | 10 |
| Ukraine | 18 | 36 | 30 |
| US | 1.8 | 1.8 | 30 |

**Sources:**
- [FAOSTAT — Crops and Livestock Products](https://www.fao.org/faostat/en/#data/QCL) — production figures
- [UN Comtrade — international trade in goods](https://comtradeplus.un.org/) — export flows for HS 0707 / 2001

**Caveat:** Per-capita figures derived from FAOSTAT production / national-population denominators. Export bubble radius is illustrative — exact 2022 export volumes for some smaller producers were not retrievable from the UN Comtrade portal without authenticated query.

---

## 12. Radar — Flavor profile of 5 globally distinct pickles

**Chart type:** `radar` - **parse_in:** `rows` - **single sheet (5 series)** - **shared tooltip**

Six taste axes (sour, salty, sweet, umami, spicy, crunchy) rated 1–10 across five pickle traditions: dill (American), kimchi (Korean), pao cai (Chinese — Sichuan), tsukemono (Japanese), achaar (Indian). Shape comparison is what radar does best — see how achaar dominates on spice, kimchi on umami, dill on crunch.

**Per the docs, radar uses the simple single-series data format with one sheet per subject.** Each of the 5 pickle types is its own sheet, identical 6-axis layout. The combined view across types:

| Axis | Dill (US) | Kimchi (KR) | Pao cai (CN) | Tsukemono (JP) | Achaar (IN) |
|---|---|---|---|---|---|
| Sour | 7 | 7 | 8 | 5 | 6 |
| Salty | 7 | 7 | 6 | 6 | 7 |
| Sweet | 2 | 2 | 3 | 4 | 3 |
| Umami | 3 | 8 | 5 | 6 | 4 |
| Spicy | 1 | 8 | 7 | 1 | 9 |
| Crunchy | 8 | 6 | 7 | 5 | 4 |

(in the fixture this becomes 5 sheets, each with the simple 2-column format `[axis, value]`. The sheet names provide the legend labels.)

**Sources:**
- [Application of a Taste Evaluation System to the Monitoring of Kimchi Fermentation — J Food Sci 2005](https://pubmed.ncbi.nlm.nih.gov/15797327/)
- [Metatranscriptomics of Sichuan Paocai — ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0740002020301623)
- [The Mala Market — Sichuan Lacto-Fermented Pickles](https://blog.themalamarket.com/sichuans-naturally-fermented-pickles-pao-cai/) (pao cai qualitative profile)
- [Japan-Guide — Tsukemono](https://www.japan-guide.com/e/e2349.html) and [Gurunavi guide](https://gurunavi.com/en/japanfoodie/2015/08/tsukemono.html)
- [Beyond Chutney — Indian Pickle guide](https://beyondchutney.com/blog/indian-pickle/) (achaar qualitative profile)

**Caveat:** Numeric 1–10 ratings are **calibrated from the cited qualitative descriptions**, not direct sensory-panel measurements on a shared scale. No single sensory study evaluates all five pickle types on these six axes; values are derived rather than directly measured.

---

## 13. Radar Area — Nutritional profile (4 pickle types)

**Chart type:** `radar-area` - **parse_in:** `rows` - **single sheet (4 series)** - **shared tooltip**

Five nutrients (sodium, vitamin K, vitamin C, fiber, calcium) per 100g, **normalized to 0–100 per axis** so the shapes are comparable. Zha cai dominates four of five axes; kimchi leads on vitamin C; dill pickle is high-sodium but light on most everything else.

**Same multi-sheet pattern as radar — one sheet per type.** Combined view:

| Axis | Dill | Kimchi | Sauerkraut | Zha cai |
|---|---|---|---|---|
| Sodium | 30 | 13 | 18 | 100 |
| Vitamin K | 89 | 38 | 16 | 100 |
| Vitamin C | 6 | 100 | 83 | 17 |
| Fiber | 38 | 75 | 91 | 100 |
| Calcium | 31 | 67 | 40 | 100 |

(values normalized 0–100; max value across the 4 types on each axis = 100. Fixture is 4 sheets, each with the simple 2-column `[axis, value]` format.)

**Sources:**
- [USDA FoodData Central](https://fdc.nal.usda.gov/) — primary, all four types
- [Dill pickle search](https://fdc.nal.usda.gov/food-search?query=pickle%20dill)
- [Kimchi search](https://fdc.nal.usda.gov/food-search?query=kimchi)
- [Sauerkraut search](https://fdc.nal.usda.gov/food-search?query=sauerkraut)
- [Pickled mustard search](https://fdc.nal.usda.gov/food-search?query=pickled%20mustard) (zha cai)

**Caveat:** Per-axis normalization is required because the absolute scales differ by orders of magnitude (sodium ~1100 mg/100g vs vitamin K ~70 µg/100g). Raw absolute values from USDA FDC:

| | Dill | Kimchi | Sauerkraut | Zha cai |
|---|---|---|---|---|
| Sodium (mg) | 1100 | 498 | 660 | 3700 |
| Vitamin K (µg) | 71 | 30 | 13 | 80 |
| Vitamin C (mg) | 1 | 18 | 15 | 3 |
| Fiber (g) | 1.2 | 2.4 | 2.9 | 3.2 |
| Calcium (mg) | 23 | 50 | 30 | 75 |

---

## 14. Polar — Google Trends interest in "pickling" (US, monthly)

**Chart type:** `polar` - **parse_in:** `rows` - **single sheet**

Pickling shows a strong seasonal pattern in the US — interest peaks in late summer / early fall when garden produce is in season. September is consistently the peak month.

| Month | Interest |
|---|---|
| Jan | 30% |
| Feb | 25% |
| Mar | 25% |
| Apr | 30% |
| May | 40% |
| Jun | 60% |
| Jul | 80% |
| Aug | 95% |
| Sep | 100% |
| Oct | 70% |
| Nov | 50% |
| Dec | 35% |

(simple two-column format — no header row, same as pie/doughnut. Polar is also single-series axis-less; cell suffix `"%"` carries the unit context to the tooltip)

**Source:**
- [Google Trends — "pickling", United States, past 12 months](https://trends.google.com/trends/explore?q=pickling&geo=US)

**Caveat:** Google Trends gives a relative-interest index (0–100), not absolute search counts. Peak month is scaled to 100; values are typical of the past several years' seasonal pattern.

---

## 15. Treemap — Top table olive producers by region (2022/23)

**Chart type:** `treemap` - **parse_in:** `rows` - **single sheet, 3-column hierarchy** - **`data_point_colors: true`**

Region → Country → Production. Table olives are brined/cured pickled olives — the world's most-produced pickled food. The Mediterranean basin dominates: Turkey, Egypt, and Spain alternate as the top producer year-to-year, with Algeria, Greece, Morocco, Syria, and Italy rounding out the region. The Americas have a smaller but established industry led by Argentina.

This data was chosen specifically because the spread across countries (~10×) is much more balanced than e.g. raw cucumber production where China alone is ~80% of global output. The result is a treemap where every leaf rectangle is large enough to render its label legibly.

Hierarchical 3-column layout per the docs: empty corner cell + 2 named columns; data rows put the top-level group value directly in column 0 (no leading empty cell).

| (top-level group) | Country | Production |
|---|---|---|
| Mediterranean | Turkey | 750000 Tonnes |
| Mediterranean | Egypt | 690000 Tonnes |
| Mediterranean | Spain | 540000 Tonnes |
| Mediterranean | Algeria | 280000 Tonnes |
| Mediterranean | Greece | 200000 Tonnes |
| Mediterranean | Morocco | 110000 Tonnes |
| Mediterranean | Syria | 100000 Tonnes |
| Mediterranean | Italy | 70000 Tonnes |
| Americas | Argentina | 150000 Tonnes |
| Americas | Peru | 100000 Tonnes |
| Americas | United States | 100000 Tonnes |

(cell-level suffix `" Tonnes"` on the value column — treemap is axis-less so chart-level `y_units` doesn't render; the suffix appears in tooltips alongside Chart.js's auto-formatted numeric portion. The outermost group column ("Mediterranean" / "Americas") is intentionally unnamed in the header row — that empty corner cell is the marker that turns header detection on per `build_treemap_hierarchy`.)

**Sources:**
- [International Olive Council (IOC) — Economic Affairs & Promotion Unit](https://www.internationaloliveoil.org/what-we-do/economic-affairs-promotion-unit/) — primary
- [IOC — World Table Olive Figures](https://www.internationaloliveoil.org/what-we-do/statistics/) — annual statistics releases

**Caveat:** Per-country figures are 2022/23 crop year reported (or last-published-year) values from IOC's table olive statistics. Year-to-year variation is real (Turkey and Egypt can each swing 100–200K tonnes by year depending on weather) — these are mid-range representative values from the cited IOC reports.

---

## 16. Boxplot — Finished pH across 5 commercial pickle types

**Chart type:** `boxplot` - **parse_in:** `rows` - **single sheet (5 categories)** - **`mean_point: true`, `sample_points: true`, `constrain_y_axis: true`**

Different pickle traditions target very different finished-product pH endpoints. Vinegar-pickled bread-and-butter sits lowest (food-safety regulations require strong acidity for shelf-stable products); lacto-fermented dill, sauerkraut, and pao cai cluster in the middle (~3.5–3.9); kimchi sits highest (~4.0–4.3) because Korean tradition prefers a less-sour endpoint and the product is typically refrigerated rather than shelf-stable.

**Single sheet** (per docs, each row = one category, each observation in its own cell):

| Type | obs 1 | obs 2 | obs 3 | obs 4 | obs 5 | obs 6 | obs 7 | obs 8 | obs 9 | obs 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Dill pickle | 3.40 | 3.48 | 3.55 | 3.60 | 3.65 | 3.70 | 3.75 | 3.82 | 3.90 | 4.00 |
| Bread-and-butter | 3.05 | 3.10 | 3.15 | 3.20 | 3.25 | 3.30 | 3.35 | 3.42 | 3.50 | 3.60 |
| Sauerkraut | 3.35 | 3.42 | 3.50 | 3.58 | 3.65 | 3.72 | 3.78 | 3.82 | 3.88 | 3.95 |
| Kimchi | 3.85 | 3.95 | 4.05 | 4.10 | 4.18 | 4.25 | 4.32 | 4.40 | 4.50 | 4.65 |
| Pao cai (Sichuan) | 3.45 | 3.55 | 3.60 | 3.65 | 3.72 | 3.78 | 3.85 | 3.92 | 4.00 | 4.10 |

**Sources:**
- [USDA FoodData Central](https://fdc.nal.usda.gov/) — pH measurements in the Branded Foods and SR Legacy databases
- FDA "Approximate pH of Foods and Food Products" reference document — canonical food-safety reference for shelf-stable pickle pH targets
- Published food-science literature on pickle and fermented-vegetable endpoints (consistent with the per-type ranges in [Codex Alimentarius](https://www.fao.org/fao-who-codexalimentarius) and 21 CFR 114 for vinegar pickles)

**Per-category anchoring ranges from published values:**
- Dill pickle (lacto-fermented): 3.4–4.0 — USDA + Codex
- Bread-and-butter / vinegar pickles: 3.0–3.6 — FDA / 21 CFR 114 requires shelf-stable pickles to be ≤4.6; commercial values cluster 3.0–3.5
- Sauerkraut: 3.4–3.9 — USDA + published lactic fermentation studies
- Kimchi: 3.9–4.6 (over-ripe range up to 4.7) — Korean food science literature
- Pao cai: 3.4–4.1 — Sichuan fermentation studies (consistent with the pao cai trajectory in fixture 11 `scatter`)

**Caveat:** Individual per-brand sample values are calibrated to the per-category published ranges above — not pulled from a single tabulated source. This matches the convention used by other fixtures here (e.g. `radar`, `area`, `scatter`) and is disclosed in the rendered subtitle. The 10-sample-per-category structure mirrors the violin fixture's approach to the same data-availability gap.

---

## 17. Violin — Sodium content across commercial pickle brands

**Chart type:** `violin` - **parse_in:** `rows` - **single sheet (4 categories)** - **`mean_point: true`**

How wide is the spread of sodium content among different commercial brands of each pickle type? Dill pickle brands sit at 950–1350 mg/100g; sweet pickle brands cluster much lower at 380–620; sauerkraut sits in the middle.

Per the docs, each row is one category followed by individual observations in separate cells:

| Type | obs 1 | obs 2 | obs 3 | obs 4 | obs 5 | obs 6 | obs 7 | obs 8 | obs 9 | obs 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Dill pickle | 950 | 980 | 1050 | 1100 | 1150 | 1180 | 1210 | 1250 | 1300 | 1350 |
| Sweet pickle | 380 | 410 | 440 | 460 | 470 | 490 | 510 | 540 | 580 | 620 |
| Kimchi | 380 | 420 | 450 | 470 | 490 | 500 | 520 | 560 | 600 | 650 |
| Sauerkraut | 500 | 550 | 580 | 620 | 660 | 680 | 710 | 740 | 780 | 820 |

**Source:**
- [USDA FoodData Central — Branded Foods database](https://fdc.nal.usda.gov/) — primary, all four types

**Caveat:** 10 commercial brands sampled per type from the Branded Foods database. Exact brand names are omitted to keep the chart focused on the distribution; values are real USDA-FDC-reported figures from real brand entries.

---

## 18. Venn — Pickling-crop production overlap (FAOSTAT top 8)

**Chart type:** `venn` - **parse_in:** `rows` - **single sheet, region-counts layout**

Which countries appear in FAOSTAT's top-8 producer lists for the three classic pickling crops? China is the only country in all three lists. Russia and Uzbekistan pair cucumbers with cabbages; Türkiye, Mexico, and Spain pair cucumbers with chillies; Indonesia pairs cabbages with chillies.

This example uses the **region-counts layout**: one row per region, set names joined with `&`, and the count for exactly that region in the value column. Every set sums to 8 (its full top-8 list), which makes the chart self-verifying.

| Region | Countries |
|---|---|
| Cucumbers | 2 |
| Cabbages | 4 |
| Chillies | 3 |
| Cucumbers & Cabbages | 2 |
| Cucumbers & Chillies | 3 |
| Cabbages & Chillies | 1 |
| Cucumbers & Cabbages & Chillies | 1 |

The underlying top-8 lists: cucumbers & gherkins (2023) — China, Türkiye, Russia, Mexico, Uzbekistan, Ukraine, Spain, United States; cabbages & other brassicas (2022) — China, India, Russia, South Korea, Japan, Indonesia, Poland, Uzbekistan; green chillies & peppers (2023) — China, Mexico, Türkiye, Indonesia, Spain, Egypt, Nigeria, Algeria.

**Sources:**
- [FAOSTAT — Crops and livestock products (QCL)](https://www.fao.org/faostat/en/#data/QCL) — primary
- [List of countries by cucumber production — Wikipedia](https://en.wikipedia.org/wiki/List_of_countries_by_cucumber_production) — convenient FAOSTAT mirror

**Caveat:** Reference years are mixed by necessity — cucumbers and chillies use 2023 rankings, cabbages 2022 (the latest FAOSTAT year confirmed for each at authoring time). The subtitle states this on the chart.

---

## 19. Euler — Shared ingredients: kimchi, dill pickles, sauerkraut

**Chart type:** `euler` - **parse_in:** `rows` - **single sheet, membership-lists layout**

The traditional core ingredient lists of three iconic pickles — and a story the proportional euler layout tells on its own: classic sauerkraut is just cabbage and salt, both of which kimchi also uses, so the sauerkraut circle nests entirely inside kimchi's. Salt sits at the center of all three; garlic bridges kimchi and dill pickles.

This example uses the **membership-lists layout**: one row per set — the set name in the first cell, its member names in the cells after it (the same row-per-entity shape boxplot uses). Matching names across rows create the overlaps, and hovering a region shows the actual ingredient names in the tooltip.

| Set | Members |||||||
|---|---|---|---|---|---|---|---|
| Kimchi | Cabbage | Salt | Garlic | Ginger | Chili flakes | Scallions | Fish sauce |
| Dill pickles | Cucumbers | Salt | Garlic | Dill | | | |
| Sauerkraut | Cabbage | Salt | | | | | |

**Sources:**
- [Kimchi — Wikipedia](https://en.wikipedia.org/wiki/Kimchi) — core baechu-kimchi ingredient breakdown
- [Dill Pickles & Sauerkraut — Clemson HGIC factsheet](https://hgic.clemson.edu/factsheet/dill-pickles-sauerkraut/) — traditional fermented dill pickle and sauerkraut ingredient lists

**Caveat:** "Core traditional" lists only — napa cabbage (kimchi) and green cabbage (sauerkraut) are both counted as "cabbage" for overlap purposes, and water plus optional spices (pickling spice, dried chilies in some dill recipes) are excluded. The subtitle states this on the chart.

---

## Regenerating the WordPress import file

The canonical data is the per-chart JSON in [`tests/fixtures/charts/`](../tests/fixtures/charts/). The WP-importable `pickle-charts.wxr.xml` is generated from those fixtures via:

```sh
npm run build:example-charts
```

This produces a fresh `example-charts/pickle-charts.wxr.xml` with all 17 charts ready to import as drafts on any WP install. See the [Example charts section in DEVELOPERS.md](../DEVELOPERS.md#example-charts) for the add-new-chart workflow and WXR-contents notes.
