import { ApiPromise } from "@polkadot/api";
import { BigNumber } from "ethers";
import {
  complement,
  curry,
  either,
  eqBy,
  identity,
  isEmpty,
  join,
  pipe,
  prop,
  props,
  where,
} from "ramda";
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
import { BasicExtrinsic, Pair, PairPrice, PublishablePair } from "./types";

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
 * Picks prices for the given pair from provided observable.
 */
export const pickPairPrice = curry(
  (
    pair: Pair | PublishablePair,
    pairPrices$: Observable<PairPrice>
  ): Observable<PairPrice> =>
    pairPrices$.pipe(filterRx(where({ pair: eqPairs(pair) })))
);

/**
 * Batches extrinsics received from the observable.
 */
export const batchExtrinsics = curry(
  <A extends ApiPromise>(
    api: A,
    timeLimit: number,
    amountLimit: number,
    extrs$: Observable<BasicExtrinsic>
  ): Observable<BasicExtrinsic> =>
    extrs$.pipe(
      bufferTime(timeLimit, null, amountLimit),
      filterRx(complement(isEmpty)),
      mapRx((batch) =>
        batch.length === 1 ? batch[0] : api.tx.utility.batchAll(batch)
      )
    )
);

/**
 * Returns underlying pair for the given pair.
 */
export const rawPair: (pair: Pair | PublishablePair) => Pair = either(
  prop("pair"),
  identity
);

/**
 * Returns unique id of pair in format %FROM%/%TO%/%DECIMALS%
 */
export const pairId: (pair: Pair | PublishablePair) => string = pipe(
  rawPair,
  props(["from", "to", "decimals"]),
  join("/")
);

/**
 * Checks if two pairs are equal by `from`, `to` and `decimals` properties.
 */
export const eqPairs = eqBy(pairId);

/**
 * Changes decimals for the given value.
 */
export const changeDecimals = curry(
  (from: number, to: number, value: BigNumber): BigNumber => {
    if (to < from) {
      return value.div(BigNumber.from(10).pow(from - to));
    } else if (to > from) {
      return value.mul(BigNumber.from(10).pow(to - from));
    } else {
      return value;
    }
  }
);
