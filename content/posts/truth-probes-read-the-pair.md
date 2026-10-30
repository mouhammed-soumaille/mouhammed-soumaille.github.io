---
title: "Truth probes read the pair, not the “not”"
date: 2026-10-30
draft: true          # stays off the live site until you change this to false
description: "Linear truth probes on Qwen2.5 fail on negated statements because they learn which pairs go together, not whether a sentence is true."
---

{{< todo >}}
**Summary (2–3 sentences, your words).** Points to cover:
- Linear probes trained on affirmative statements are near-perfect in-distribution (cities: 0.96 at 0.5B, 0.99 at 1.5B).
- On negated statements they score far *below* chance (1.5B, layer 11: 0.02 / 0.01 / 0.00).
- The reason: the probe gives a statement and its negated twin the same answer 96–100% of the time. It reads the pair and ignores the “not”.
{{< /todo >}}

## Setup

{{< todo >}}
Models (Qwen2.5-0.5B and 1.5B), datasets (Geometry of Truth: cities, neg_cities, sp_en_trans, neg_sp_en_trans, larger_than), last-token activations, logistic-regression probes, layer chosen on validation accuracy. Mention the four tied layers at 1.5B (11, 12, 15, 19) and that results use the earliest.
{{< /todo >}}

## Result 1: below chance on negation

{{< demo "probe" >}}

{{< todo >}}
Describe the figure in a sentence or two: what the dots are, what the toggle does, what to notice.
{{< /todo >}}

## Result 2: the pair test

The quantity I use is the *pair agreement* of a probe $f$: the fraction of statement pairs $(x_i, \neg x_i)$ on which it gives the same answer,

$$
A(f) = \frac{1}{N} \sum_{i=1}^{N} \mathbf{1}\big[f(x_i) = f(\neg x_i)\big].
$$

A probe that tracks truth should have $A(f) \approx 0$; a probe that ignores negation has $A(f) \approx 1$.

{{< todo >}}
Numbers: 96–100% at 1.5B layer 11; about 50% at layer 19, where the inversion disappears. Explain in your words why this is the right test.
{{< /todo >}}

## Result 3: training on negations helps, more at 1.5B

{{< todo >}}
Training on cities + neg_cities transfers to neg_sp_en_trans: 0.84 vs 0.36 (cities only) at 1.5B, but only 0.54 vs 0.35 at 0.5B.
{{< /todo >}}

## Prior work

{{< todo >}}
Bürger et al. 2024 (*Truth is Universal*), Poulis et al. 2026, Vicidomini 2026 (*The Anatomy of a Truth Direction*): what each found and what this adds.
{{< /todo >}}

## What I don't know yet

{{< todo >}}
The open question you want to chase next.
{{< /todo >}}

## Limitations

{{< todo >}}
Two small models; the result depends on the layer (the four tied 1.5B layers give cities → neg_cities 0.05 / 0.12 / 0.20 / 0.53); claims that did not survive 5 splits were dropped (list them briefly).
{{< /todo >}}

*AI use: [same note as in the project README].*

Code and data: [GitHub](https://github.com/).
