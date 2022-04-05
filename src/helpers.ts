import { ApiPromise } from "@polkadot/api";
import { complement, curry, eqBy, isEmpty, join, o, props, where } from "ramda";
import {
  Observable,
  OperatorFunction,
  mergeMap,
  takeUntil,
  filter,
  map as mapRx,
  filter as filterRx,
  bufferTime,
} from "rxjs";
import { BasicExtrinsic, Pair, PairPrice } from "./types";

/**
 * Acts as `switchMap` but operates over multiple stream switching by `pickItem` value.
 */
export function switchMapBy<T, R>(
  pickItem: <V>(val: T) => V,
  mapFn: (val: T) => Observable<R>
): OperatorFunction<T, R> {
  return (input$) =>
    input$.pipe(
      mergeMap((val) =>
        mapFn(val).pipe(takeUntil(input$.pipe(filter(eqBy(pickItem, val)))))
      )
    );
}

/**
 * Asserts value to be finite
 */
export const assertFinite = curry((msg, value) => {
  if (!isFinite(value)) {
    throw new Error(typeof msg === "function" ? msg() : msg);
  }
});

/**
 * Picks prices for the given pair from provided observable.
 */
export const pickPairPrice = curry(
  (pair: Pair, pairPrices$: Observable<PairPrice>): Observable<PairPrice> =>
    pairPrices$.pipe(filterRx(where({ pair: eqPairs(pair) })))
);

/**
 * Batches extrinsics received from the observable.
 */
export const batchExtrinsics = curry(
  <A extends ApiPromise>(
    api: A,
    time: number,
    limit: number,
    extrs$: Observable<BasicExtrinsic>
  ): Observable<BasicExtrinsic> =>
    extrs$.pipe(
      bufferTime(time, null, limit),
      filterRx(complement(isEmpty)),
      mapRx((batch) =>
        batch.length === 1 ? batch[0] : api.tx.utility.batchAll(batch)
      )
    )
);

/**
 * Returns unique id of pair in format %FROM%/%TO%
 */
export const pairId: (pair: Pair) => string = o(
  join("/"),
  props(["from", "to"])
);

/**
 * Checks if two pairs are equal by `from`-`to` properties.
 */
export const eqPairs = eqBy(pairId);
