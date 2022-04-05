import { curry, prop, where, whereEq } from "ramda";
import {
  Observable,
  mergeScan,
  from,
  switchMap,
  of,
  EMPTY,
  mergeMap,
  tap,
  reduce,
  catchError,
  map as mapRx,
  filter as filterRx,
  concatMap,
  connect,
  defer,
  merge,
  pluck,
  shareReplay,
  Subject,
} from "rxjs";
import { eqPairs } from "./helpers";
import { PriceFetcher, Pair, PairPrice, PairSource } from "./types";

interface PubValue<T> {
  pub: boolean;
  value: T;
}

const pub = <T>(value): PubValue<T> => ({ pub: true, value });
const priv = <T>(value): PubValue<T> => ({ pub: false, value });

/**
 * Fetches average price for each pair/pair source using given endpoints.
 */
export const fetchAveragePrices = curry(
  (
    tokenEndpoints$: Observable<PriceFetcher>,
    pairs$: Observable<Pair | PairSource>
  ): Observable<PairPrice> => {
    const pairsSubject = new Subject<PubValue<PairPrice>>();
    const result$ = pairsSubject.pipe(shareReplay(5e2));

    defer(() => pairs$)
      .pipe(
        connect((pairs$) =>
          merge(
            pairs$.pipe(
              concatMap((value) =>
                "publish" in value
                  ? of(value.to, value.from).pipe(mapRx(priv))
                  : of(pub(value))
              ),
              fetchAndAccumulateAveragePrices(tokenEndpoints$)
            ),
            pairs$.pipe(
              filterRx((value) => "publish" in value),
              resolveSources(result$.pipe(pluck("value")))
            )
          )
        )
      )
      .subscribe(pairsSubject);

    return result$.pipe(filterRx(prop("pub")), pluck("value"));
  }
);

/**
 * Resolves pair source from the dependent pairs.
 */
const resolveSources = curry(
  (prices$: Observable<PairPrice>, pairs$: Observable<PairSource>) =>
    pairs$.pipe(
      mergeMap((value: PairSource) =>
        value
          .publish(
            prices$.pipe(filterRx(where({ pair: eqPairs(value.from) }))),
            prices$.pipe(filterRx(where({ pair: eqPairs(value.to) })))
          )
          .pipe(mapRx(pub))
      )
    )
);

/**
 * Fetches every unique pair exactly once for each endpoint, collects results to form an average for each pair.
 */
const fetchAndAccumulateAveragePrices = curry(
  (
    fetchers$: Observable<PriceFetcher>,
    pairs$: Observable<PubValue<Pair>>
  ): Observable<PubValue<PairPrice>> =>
    pairs$.pipe(
      mergeScan((acc, { pub, value: pair }) => {
        const key = JSON.stringify(pair);

        let fetched: Promise<PubValue<PairPrice>> = acc[key];
        if (fetched) {
          return from(fetched).pipe(
            switchMap((value) => {
              if (pub && !value.pub) {
                value.pub = true;
                return of(value);
              }
              return EMPTY;
            })
          );
        } else {
          let resolve, reject;
          acc[key] = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
          });

          return fetchers$.pipe(
            mergeMap((endpoint) =>
              from(endpoint.fetch(pair)).pipe(
                tap(({ price }) => {
                  if (process.env.LOG_PRICE_SOURCES) {
                    console.log(
                      pair.from,
                      "/",
                      pair.to,
                      ":",
                      price,
                      "from",
                      (endpoint.constructor as any).NAME
                    );
                  }
                })
              )
            ),
            reduce(
              ({ amount, total }, { price }) => ({
                amount: amount + 1,
                total: total + price,
              }),
              { amount: 0, total: 0 }
            ),
            mapRx(({ amount, total }) => ({
              price: total / amount,
              pair,
            })),
            mapRx((value) => {
              resolve({ pub, value });
              return { pub, value };
            }),
            catchError((err) => {
              reject(err);
              throw err;
            })
          );
        }
      }, Object.create(null))
    )
);
