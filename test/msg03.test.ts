import { test } from "node:test";
import assert from "node:assert/strict";
import { checkBudget, BudgetExceededError } from "../messages/03-spend-cap.ts";

test("under budget passes", () => assert.doesNotThrow(() => checkBudget(0.01, 0.02)));
test("at budget throws", () => assert.throws(() => checkBudget(0.02, 0.02), BudgetExceededError));
test("negative spend fails closed", () => assert.throws(() => checkBudget(-1, 0.02), BudgetExceededError));
test("NaN spend fails closed", () => assert.throws(() => checkBudget(NaN, 0.02), BudgetExceededError));
