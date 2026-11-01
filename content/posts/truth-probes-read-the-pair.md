---
title: "Truth probes read the pair, not the “not”"
date: 2026-11-01
draft: true          # stays off the live site until you change this to false
description: "I trained linear truth probes on two small Qwen models. They were near-perfect on held-out statements and almost always wrong once you add the word “not”. Here is why, and why picking the layer is harder than it looks."
---

A *truth probe* is about the simplest interpretability tool there is. You take a language model, feed it a statement like “The city of Paris is in France”, record its hidden state, and train a linear classifier to predict whether the statement is true. If that works, it suggests the model represents truth along some direction in its activations, and that you might be able to read it off, for example to notice when a model says something it “knows” is false.

That only helps if the probe keeps working on statements that look different from the ones it was trained on. So this fall I tested exactly that: **does a truth probe trained on one kind of statement still work on other kinds of statements, and on negated ones?**

Short answer: on other affirmative statements, partly. On negated statements, it is usually not just wrong but *confidently* wrong, and the reason turned out to be very simple.

## Setup

I used two small models, Qwen2.5-0.5B-Instruct and Qwen2.5-1.5B-Instruct, and the true/false datasets from Marks and Tegmark's *The Geometry of Truth*: city locations (“X is in Y”), their negations (“X is not in Y”), Spanish–English translations and their negations, number comparisons (“larger than” vs “smaller than”), and company facts. Every dataset is half true and half false, so guessing gives 50%.

For each statement I took the hidden state of its last token at every layer and trained a logistic-regression probe on it. I picked the layer by validation accuracy on the cities dataset and reported accuracy on held-out examples, and on whole other datasets for transfer.

## The probes work, in-distribution

From the middle of the network on, truth is very easy to read. The best layer reaches 0.96 test accuracy at 0.5B and 0.997 at 1.5B on held-out cities, and accuracy stays high all the way to the last layer.

![Probe accuracy by layer, 1.5B](/images/truth-probes/layer_sweep.png)

So far, so good.

## Add “not”, and the probe flips

Now train on affirmative cities (“X is in Y”) and test on negated cities (“X is not in Y”). At the selected layer, the 1.5B probe gets **0.02**. Not 0.5, which would mean it learned nothing useful, but 0.02: it predicts the *opposite* label almost every time. Translations (0.006) and number comparisons (0.000) behave the same way, and so does the 0.5B model (0.04 to 0.06).

{{< demo "probe" >}}

Here is the explanation. The negated datasets are built from the *same* pairs as the originals: “Paris is in France” becomes “Paris is not in France”, with the label flipped. If the probe has learned “is this city–country pair correct?” and ignores the “not”, it gives both statements the same answer. It is right about the first one and therefore wrong about the second, which is exactly a score near zero.

You can test this directly. For a probe f and pairs of statements x and their negations ¬x, measure how often it gives both the same answer:

$$
A(f) = \frac{1}{N} \sum_{i=1}^{N} \mathbf{1}\big[f(x_i) = f(\neg x_i)\big].
$$

A probe that tracks truth should have $A(f) \approx 0$, since a statement and its negation always have opposite labels. The 1.5B probe has $A(f) = 0.96$ on cities, 0.98 on translations and 1.00 on numbers. It is reading the pair and ignoring the negation.

This is not a new discovery. Marks and Tegmark already saw that probes trained on affirmative statements transfer badly to negated ones, and Bürger et al. (2024) explained why: the activations contain a general truth direction and a second direction that flips sign under negation, and a probe trained only on affirmative statements picks up a mix of both. The pair test is just a cheap way to see that mechanism directly in a new model.

## Which layer you read from matters, even when you can't tell the layers apart

This is the part that surprised me. At 1.5B, four layers tie *exactly* for the best validation accuracy on cities: 0.997 at layers 11, 12, 15 and 19. By the usual recipe, any of them is a fine choice. On negated statements they are completely different:

| Layer (1.5B) | Validation accuracy | cities → neg_cities | Same answer on the negated twin |
|---|---|---|---|
| 11 | 0.997 | 0.05 | 0.96 |
| 12 | 0.997 | 0.12 | 0.88 |
| 15 | 0.997 | 0.20 | 0.80 |
| 19 | 0.997 | 0.53 | 0.48 |

*(means over 5 random train/test splits)*

The full curves show the same thing: accuracy on held-out examples is flat, while accuracy on the flipped dataset swings from near 0 to around chance depending on the layer.

![In-distribution vs. transfer accuracy by layer, 1.5B](/images/truth-probes/layer_transfer.png)

This also caught me out in practice. My analysis code broke the four-way tie with an unstable sort, so the same code picked layer 15 on one machine and layer 11 on another, and the cross-dataset results changed with it. I only noticed when I had Claude re-derive every number with a second, independent implementation, and its results disagreed with mine. The fix was one line, but the lesson is bigger: **validating a probe on held-out examples from its own dataset does not tell you how it behaves under a simple shift like negation.** Poulis et al. (2026) show the broader version of this on Llama-3.1-8B; what I add is that it happens even between layers that are exactly tied, so standard layer selection cannot catch it.

## Training on both polarities helps, at least at 1.5B

If the problem is that the probe never saw a negation, the obvious fix is to show it some. A probe trained on cities *and* negated cities reaches 0.84 on negated translations at 1.5B, up from 0.36 for one trained on cities alone. At 0.5B the same trick barely helps: 0.54 versus 0.35. That training on both helps is known; the gap between the two sizes is new here, but with two models it is a single data point.

## What didn't survive

An earlier draft of the write-up claimed a few more things, for example that the inversion gets weaker at 1.5B and that number comparisons are “isolated” from other datasets at 0.5B. When I re-ran everything across all tied layers and five random splits, those differences disappeared into the noise, so I dropped them. A typical cross-dataset number moves by about 0.25 between equally good layers and splits, which is a useful thing to know before trusting any single number in a table like the ones above.

## Limitations

- Two small models from one family. I don't know how this looks at 7B and beyond.
- Short, templated statements, so shared templates may drive some of the transfer.
- No causal test: a probe shows what can be read out linearly, not what the model actually uses.

## What I'm doing next

The tied-layers result raises an obvious question: if several probes look equally good on validation, how do you choose between them *without* labels for the new distribution? The pair test suggests one answer: a probe that tracks truth should give a statement and its negation opposite answers, and you can check that without knowing which one is true. That is what I'm working on now.

---

*Code, data and every number in this post: [github.com/mouhammed-soumaille/truth-probes](https://github.com/mouhammed-soumaille/truth-probes).*

*Thanks to Claude, which caught the tie-break bug during that independent re-check of the numbers and helped me edit the project's README.*

**References.** S. Marks and M. Tegmark, *The Geometry of Truth*, 2023. L. Bürger, F. A. Hamprecht and B. Nadler, *[Truth is Universal: Robust Detection of Lies in LLMs](https://arxiv.org/abs/2407.12831)*, 2024. A. Poulis, M. Crovella and E. Terzi, *[Testing the Limits of Truth Directions in LLMs](https://arxiv.org/abs/2604.03754)*, 2026.
