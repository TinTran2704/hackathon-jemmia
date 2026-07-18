import { test } from "node:test";
import assert from "node:assert/strict";
import { computeTotal, computeRecommendation } from "./scoring.js";

test("computeTotal: all zeros -> 0", () => {
  const criteria = [
    { id: "a", weight: 3 },
    { id: "b", weight: 5 },
  ];
  const scores = [
    { criterionId: "a", score: 0, confidence: "high" },
    { criterionId: "b", score: 0, confidence: "high" },
  ];
  assert.equal(computeTotal(scores, criteria), 0);
});

test("computeTotal: all fives, high confidence -> 100", () => {
  const criteria = [
    { id: "a", weight: 3 },
    { id: "b", weight: 5 },
  ];
  const scores = [
    { criterionId: "a", score: 5, confidence: "high" },
    { criterionId: "b", score: 5, confidence: "high" },
  ];
  assert.equal(computeTotal(scores, criteria), 100);
});

test("computeTotal: low confidence dampens the score by 0.7", () => {
  const criteria = [{ id: "a", weight: 5 }];
  const scores = [{ criterionId: "a", score: 5, confidence: "low" }];
  // effective = 5 * 0.7 = 3.5; total = 3.5*5 / (5*5) * 100 = 70
  assert.equal(computeTotal(scores, criteria), 70);
});

test("computeTotal: weighted average across mixed weights", () => {
  const criteria = [
    { id: "a", weight: 1 },
    { id: "b", weight: 5 },
  ];
  const scores = [
    { criterionId: "a", score: 5, confidence: "high" },
    { criterionId: "b", score: 2, confidence: "high" },
  ];
  // numerator = 5*1 + 2*5 = 15; denominator = 5*1 + 5*5 = 30; total = 50.0
  assert.equal(computeTotal(scores, criteria), 50);
});

test("computeRecommendation: knockout failure overrides a high total", () => {
  assert.equal(computeRecommendation({ total: 100, knockoutFailed: true }), "reject_review");
});

test("computeRecommendation: threshold boundaries", () => {
  assert.equal(computeRecommendation({ total: 75, knockoutFailed: false }), "strong_match");
  assert.equal(computeRecommendation({ total: 74.9, knockoutFailed: false }), "match");
  assert.equal(computeRecommendation({ total: 55, knockoutFailed: false }), "match");
  assert.equal(computeRecommendation({ total: 54.9, knockoutFailed: false }), "weak_match");
});
