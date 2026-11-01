---
title: "Ramsey numbers, and proving something exists by flipping coins"
date: 2026-11-01
draft: true
topics: ["Probability", "Combinatorics"]
figure: "ramsey"
description: "My favourite part of the lectures I gave on Alon and Spencer's The Probabilistic Method: what Ramsey numbers are, why they exist, and Erdős's random-colouring proof that they grow exponentially."
---

This semester I'm part of a student lecture series on Alon and Spencer's *The Probabilistic Method*, supervised by Dr. Colin Jahel. I gave the lectures on the first chapter, and the part I enjoyed most was the section on Ramsey numbers. This post goes through it.

## What a Ramsey number is

Take the complete graph $K_n$, where every pair of the $n$ vertices is joined by an edge, and colour each edge red or blue. The Ramsey number $R(k,k)$ is the smallest $n$ such that every colouring, no matter how you choose it, contains $k$ vertices whose edges all have the same colour. More generally, $R(k,\ell)$ is the smallest $n$ that forces either a red $K_k$ or a blue $K_\ell$.

The usual way to say it: $R(3,3)$ is the smallest number of people at a party that guarantees three mutual friends or three mutual strangers.

## The first case: $R(3,3) = 6$

On 5 vertices you can avoid a one-colour triangle:

{{< diagram "k5" "Colour the 5-cycle one colour and the remaining five edges the other. Neither colour contains a triangle, so $R(3,3) > 5$." >}}

On 6 vertices you can't. Pick any vertex $v$. It has 5 edges, so at least 3 of them have the same colour, say red, going to $a$, $b$ and $c$. If any edge among $a, b, c$ is red, it forms a red triangle with $v$. If none of them is red, then $a, b, c$ is a blue triangle.

{{< diagram "r33" "The pigeonhole step behind $R(3,3) \le 6$." >}}

So $R(3,3) = 6$.

## Ramsey numbers exist, and are at most $4^k$

The same argument works in general. For $k, \ell \ge 2$,

$$
R(k,\ell) \le R(k-1,\ell) + R(k,\ell-1).
$$

Take $n = R(k-1,\ell) + R(k,\ell-1)$ vertices and pick one vertex $v$. Among its $n - 1$ neighbours, either at least $R(k-1,\ell)$ are joined to $v$ by red edges, or at least $R(k,\ell-1)$ by blue edges. In the first case, those neighbours contain a blue $K_\ell$, or a red $K_{k-1}$ that becomes a red $K_k$ when you add $v$. The blue case is the same with the colours swapped.

Starting from $R(k,1) = R(1,\ell) = 1$, this recursion gives $R(k,\ell) \le \binom{k+\ell-2}{k-1}$, and in particular

$$
R(k,k) \le \binom{2k-2}{k-1} < 4^k.
$$

So Ramsey numbers always exist, and they grow at most exponentially.

## The lower bound: colour at random

For a lower bound we need the opposite: a colouring of a large $K_n$ with no one-colour $K_k$. For small $k$ you can find one by hand, like the 5-cycle above, but for large $k$ nobody knows how to write a good one down. Erdős's idea in 1947 was not to try. Colour every edge red or blue at random, each with probability $1/2$, independently.

Fix a set $S$ of $k$ vertices. It has $\binom{k}{2}$ edges, so the probability that they are all red or all blue is

$$
\mathbb{P}(S \text{ is one colour}) = 2 \cdot 2^{-\binom{k}{2}} = 2^{1-\binom{k}{2}}.
$$

There are $\binom{n}{k}$ such sets. The probability that at least one of them is one colour is at most the sum of their probabilities (the union bound), so

$$
\mathbb{P}(\text{some } K_k \text{ is one colour}) \le \binom{n}{k}\, 2^{1-\binom{k}{2}}.
$$

If this is less than 1, then with positive probability the random colouring has no one-colour $K_k$. So at least one such colouring exists, and $R(k,k) > n$.

Now take $n = \lfloor 2^{k/2} \rfloor$. Using $\binom{n}{k} \le n^k/k!$ and $n^k \le 2^{k^2/2}$,

$$
\binom{n}{k}\, 2^{1-\binom{k}{2}} \le \frac{2^{k^2/2}}{k!} \cdot 2^{1 - k(k-1)/2} = \frac{2^{1+k/2}}{k!},
$$

which is less than 1 for every $k \ge 3$. Therefore

$$
R(k,k) > 2^{k/2} \qquad (k \ge 3).
$$

I like this proof because it is short and quite intuitive. There are not that many sets of $k$ vertices, roughly $n^k$, and each one is extremely unlikely to come out a single colour, since that needs about $k^2/2$ coin flips to agree. So for $n$ up to about $2^{k/2}$, the bad events don't add up to much.

You can try it below. Pick $n$ and $k$: the demo computes the expected number of one-colour $K_k$'s in a random colouring, and when it drops below 1 it gives the bound. "Find a colouring with none" keeps recolouring at random until it gets one.

{{< demo "ramsey" >}}

## What the bound does and doesn't tell you

The argument is not sharp. At $n = 5$, $k = 3$ the bound is $\binom{5}{3} \cdot 2^{-2} = 2.5$, so it can't show $R(3,3) > 5$, even though the 5-cycle colouring does. It also says nothing about what a good colouring looks like: it proves one exists without finding it.

Putting the two bounds together,

$$
2^{k/2} < R(k,k) < 4^k,
$$

and the gap between them is still open. The exact values are only known for very small $k$: $R(3,3) = 6$ and $R(4,4) = 18$. For $R(5,5)$ we only know $43 \le R(5,5) \le 46$; the upper bound of 46 is from 2024. For large $k$, the upper bound was improved to $(4 - \varepsilon)^k$ for a small fixed $\varepsilon > 0$ in 2023, the first exponential improvement since the 1930s. Erdős's random lower bound has only been improved by a constant factor since 1947, and nobody knows an explicit colouring that comes close to it.

---

*The proofs follow Chapter 1 of N. Alon and J. H. Spencer, The Probabilistic Method (3rd ed., Wiley, 2008). The recent results: V. Angeltveit and B. D. McKay, [R(5,5) ≤ 46](https://arxiv.org/abs/2409.15709), 2024; M. Campos, S. Griffiths, R. Morris and J. Sahasrabudhe, [An exponential improvement for diagonal Ramsey](https://arxiv.org/abs/2303.09521), Annals of Mathematics, 2026.*
