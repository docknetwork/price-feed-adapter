import { curry, head, pipe, apply } from "ramda";
import {
  Observable,
  from,
  of,
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
  partition,
  ReplaySubject,
} from "rxjs";
import {
  Pair,
  PairPrice,
  PublishablePairSource,
  PublishablePair,
  PublishablePairPrice,
  Publishable,
} from "./types";
import { PriceFetcher } from "./fetchers";
import { rawPair, pairId } from "./helpers";
import { BigNumber } from "ethers";

type GetAveragePrices<T> = (
  tokenEndpoints$: Observable<PriceFetcher>,
  pairs$: Observable<Pair | Publishable>
) => Observable<T>;

/**
 * Fetches average price for each pair/pair source using given endpoints.
 * Returns two observables - [publishable prices, internally resolved prices].
 */
const resolveAndFetchAveragePrices = curry(
  (
    tokenEndpoints$: Observable<PriceFetcher>,
    pairs$: Observable<Pair | Publishable>
  ): [Observable<PublishablePairPrice>, Observable<PairPrice>] => {
    const priceSubject = new ReplaySubject<PairPrice | PublishablePairPrice>();
    const [publicRes$, internalRes$] = partition(
      priceSubject,
      ({ pair }) => "publishConfig" in pair
    ) as [Observable<PublishablePairPrice>, Observable<PairPrice>];

    defer(() => pairs$)
      .pipe(
        connect((pairs$) =>
          merge(
            pairs$.pipe(
              concatMap((value) => ("deps" in value ? value.deps : of(value))),
              fetchAndAccumulateAveragePrices(tokenEndpoints$)
            ),
            pairs$.pipe(
              filterRx((value) => "deps" in value),
              publishResolved(internalRes$)
            )
          )
        )
      )
      .subscribe(priceSubject);

    return [publicRes$, internalRes$];
  }
);

/**
 * Fetches average price for each pair/pair source using given endpoints
 * and returns only pairs for publishing.
 */
export const getPublishableAveragePrices = curry(
  pipe(
    resolveAndFetchAveragePrices,
    head
  ) as GetAveragePrices<PublishablePairPrice>
);

/**
 * Fetches average price for each pair/pair source using given endpoints
 * and returns all pairs.
 */
export const getAllAveragePrices = curry(
  pipe(resolveAndFetchAveragePrices, apply(merge)) as GetAveragePrices<
    PairPrice | PublishablePairPrice
  >
);

/**
 * Publishes resolved pair sources.
 */
const publishResolved = curry(
  (prices$: Observable<PairPrice>, pairs$: Observable<PublishablePairSource>) =>
    pairs$.pipe(
      mergeMap((pair: PublishablePairSource) => pair.publish(prices$))
    )
);

/**
 * Fetches average for the given pair using supplied fetchers.
 */
const fetchAveragePriceForPair = curry(
  (pair: Pair, fetchers$: Observable<PriceFetcher>): Observable<BigNumber> =>
    fetchers$.pipe(
      mergeMap((endpoint) =>
        from(endpoint.fetchPrice(pair)).pipe(
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
          total: total.add(price),
        }),
        { amount: 0, total: BigNumber.from(0) }
      ),
      mapRx(({ amount, total }) => total.div(BigNumber.from(amount))),
      catchError((err) => {
        throw err;
      })
    )
);

/**
 * Fetches every unique pair exactly once for each endpoint, collects results to form an average for each pair.
 */
const fetchAndAccumulateAveragePrices = curry(
  (
    fetchers$: Observable<PriceFetcher>,
    pairs$: Observable<Pair | PublishablePair>
  ): Observable<PairPrice | PublishablePairPrice> => {
    const acc = Object.create(null);

    return pairs$.pipe(
      mergeMap((pair) => {
        const key = pairId(pair);

        let subj: ReplaySubject<BigNumber> | void = acc[key];
        if (!subj) {
          subj = new ReplaySubject<BigNumber>();
          fetchers$
            .pipe(fetchAveragePriceForPair(rawPair(pair)))
            .subscribe(subj);

          acc[key] = subj;
        }

        return subj.pipe(mapRx((price) => ({ pair, price }))) as Observable<
          PairPrice | PublishablePairPrice
        >;
      })
    );
  }
);
