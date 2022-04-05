import { curry, eqBy, props } from "ramda";
import {
  Observable,
  OperatorFunction,
  mergeMap,
  from,
  takeUntil,
  filter,
  map as mapRx,
  bufferCount,
} from "rxjs";

export function switchMapBy<T, R>(
  pickItem: (val: T) => any,
  mapFn: (val: T) => Observable<R> | Promise<R>
): OperatorFunction<T, R> {
  return (input$) =>
    input$.pipe(
      mergeMap((val) =>
        from(mapFn(val)).pipe(
          takeUntil(input$.pipe(filter((i) => eqBy(pickItem, i, val))))
        )
      )
    );
}

export const assertFinite = curry((msg, value) => {
  if (!isFinite(value)) {
    throw new Error(typeof msg === "function" ? msg() : msg);
  }
});

/**
 * Batches extrinsics received from the observable.
 *
 * @param {*} api
 * @param {number} limit
 * @param {Observable<import("@polkadot/types/interfaces").Extrinsic>} extrs$
 * @returns {Observable<import("@polkadot/types/interfaces").Extrinsic>}
 */
export const batchExtrinsics = curry(
  <T>(api, limit: number, extrs$: Observable<T>) =>
    extrs$.pipe(
      bufferCount(limit),
      mapRx((batch) =>
        batch.length === 1 ? batch[0] : api.tx.utility.batchAll(batch)
      )
    )
);

export const eqPairs = eqBy(props(["from", "to"]));
