import { expect, test } from '@jest/globals';
import { isPotentialPriceUpdate, priceUpdateNeeded, timestampSecs } from '../src/util';

test('Check PriceUpdateParams', () => {
  expect(isPotentialPriceUpdate({
    forceWrite: true,
    currentPrice: 10,
    thresholdPct: 1,
    idleTime: 100
  })).toBe(true);

  expect(isPotentialPriceUpdate({
    forceWrite: false,
    currentPrice: 10,
    thresholdPct: 0,
    idleTime: 100
  })).toBe(true);

  expect(isPotentialPriceUpdate({
    forceWrite: false,
    currentPrice: 10,
    thresholdPct: 1,
    idleTime: 10
  })).toBe(false);
});

test('Is price update needed', () => {
  const params = {
    forceWrite: false,
    currentPrice: 100,
    thresholdPct: 5,
    idleTime: 10
  };
  
  // No change in price and price not stale
  expect(priceUpdateNeeded(100, {updatedAt: timestampSecs() - 2, answer: 100}, params)).toBe(false);

  // Price hasn't changed by threshold
  expect(priceUpdateNeeded(100, {updatedAt: timestampSecs() - 8, answer: 96}, params)).toBe(false);

  // Price hasn't changed by threshold but price is stale
  expect(priceUpdateNeeded(100, {updatedAt: timestampSecs() - 11, answer: 96}, params)).toBe(true);

  // Price has changed by threshold but price isn't stale
  expect(priceUpdateNeeded(100, {updatedAt: timestampSecs() - 8, answer: 94}, params)).toBe(true);
});