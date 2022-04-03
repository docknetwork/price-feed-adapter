import {
  interval,
  from,
  combineLatest,
  lastValueFrom,
  zip,
  defer,
  firstValueFrom,
  EMPTY,
  Observable,
  merge,
  timer,
  of,
  Subject,
  pairs,
  ReplaySubject,
  BehaviorSubject,
  OperatorFunction,
  connectable,
} from "rxjs";
import {
  filter,
  map as mapRx,
  mapTo,
  mergeAll,
  mergeMap,
  filter as filterRx,
  mergeWith,
  reduce,
  retry,
  switchMap,
  withLatestFrom,
  zipWith,
  zipAll,
  distinct,
  concatMap,
  tap,
  share,
  connect,
  multicast,
  takeUntil,
  shareReplay,
  pluck,
} from "rxjs/operators";
import fetch from "node-fetch";
import dock from "@docknetwork/sdk";
import {
  curry,
  assoc,
  whereEq,
  toString,
  equals,
  eqBy,
  prop,
  pathEq,
  where,
  o,
} from "ramda";
import {
  BinanceFetcher,
  CoinmarketcapFetcher,
  CryptocompareFetcher,
  CoingeckoFetcher,
} from "./endpoint";
import { Pair, PairPrice, PairSource, PriceFetcher } from "./types";

const DOCK_USD = "DOCK/USD";
const DOCK_ETH_GAS = "DOCK/ETH_GAS";
const WATCH_TIME = 30e3;

const getPrice = async (pair) => {
  //console.log(dock.api.rpc)
  return 10;
  return await dock.api.rpc.price_feed.price_feed_price(pair);
};

const fetchPrices = curry(
  (
    endpoints$: Observable<PriceFetcher>,
    pairs$: Observable<Pair | PairSource>
  ) =>
    pairs$.pipe(
      concatMap((value) =>
        "publish" in value
          ? of(
              { pub: false, value: value.to },
              { pub: false, value: value.from }
            )
          : of({ pub: true, value })
      ),
      distinct(o(JSON.stringify, prop("value"))),
      mergeMap(({ pub, value: pair }) =>
        endpoints$.pipe(
          mergeMap((endpoint) => from(endpoint.fetch(pair))),
          filterRx(({ price: value }) => value && Number.isFinite(value)),
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
          mapRx((value) => ({ pub, value }))
        )
      )
    )
);

const resolveSources = curry(
  (prices$: Observable<PairPrice>, pairs$: Observable<PairSource>) =>
    pairs$.pipe(
      mergeMap((value: PairSource) =>
        value
          .publish(
            prices$.pipe(filterRx(whereEq({ pair: value.from }))),
            prices$.pipe(filterRx(whereEq({ pair: value.to })))
          )
          .pipe(mapRx((value) => ({ pub: true, value })))
      )
    )
);

const getAveragePrices = curry(
  (
    endpoints$: Observable<PriceFetcher>,
    pairs$: Observable<Pair | PairSource>
  ): Observable<PairPrice> => {
    interface PubValue<T> {
      pub: boolean;
      value: T;
    }

    const pairsSubject = new Subject<PubValue<PairPrice>>();
    const result$ = pairsSubject.pipe(shareReplay(5e2));

    defer(() => pairs$)
      .pipe(
        connect((pairs$) =>
          merge(
            pairs$.pipe(fetchPrices(endpoints$)),
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

const watch = curry(
  (
    getAverages: (pairs$: Observable<Pair>) => Observable<PairPrice>,
    initiator: any,
    pairBuckets$: Observable<Observable<Pair>>
  ) =>
    pairBuckets$.pipe(
      switchMap((pairs$) =>
        pairs$.pipe(
          getAverages,
          mergeMap(({ price: avg, pair }) =>
            from(getPrice(pair)).pipe(
              switchMap((current: number) => {
                console.log(
                  "Pair average for",
                  pair.from,
                  "/",
                  pair.to,
                  ": ",
                  avg
                );

                if (Math.abs(current - avg * pair.multiplier) > 10) {
                  return defer(() =>
                    from(
                      dock.api.tx.priceFeedModule
                        .setPrice(pair, avg * pair.multiplier)
                        .signAndSend(initiator)
                    )
                  ).pipe(retry(3));
                } else {
                  return EMPTY;
                }
              })
            )
          )
        )
      )
    )
);

const getGasPrice = async () => {
  const gasPrice =
    (
      await (
        (await fetch("https://ethgasstation.info/api/ethgasAPI.json")) as any
      ).json()
    ).average / 1e11;

  return gasPrice;
};

async function main() {
  await dock.init({ endpoint: "localhost:9944" });
  const initiator = dock.keyring.addFromUri("//Alice");
  dock.setAccount(initiator);

  const endpoints$ = from([
    new BinanceFetcher(),
    new CryptocompareFetcher(),
    new CoinmarketcapFetcher(),
    new CoingeckoFetcher(),
  ]);
  const gasPrice$ = defer(() => from(getGasPrice()));
  const pairs$ = from([
    { from: "DOCK", to: "USD", multiplier: 1e2 },
    {
      from: { from: "DOCK", to: "USD", multiplier: 1e2 },
      to: { from: "ETH", to: "USD", multiplier: 1e2 },
      publish: (from$: Observable<PairPrice>, to$: Observable<PairPrice>) =>
        zip(from$, to$, gasPrice$).pipe(
          mapRx(([dockUsd, ethUsd, gasPrice]) => ({
            price: dockUsd.price / ethUsd.price / gasPrice,
            pair: { from: "DOCK", to: "GAS", multiplier: 1e3 },
          }))
        ),
    },
  ]);

  await new Promise((resolve, reject) => {
    interval(WATCH_TIME)
      .pipe(
        mapRx(() => pairs$),
        watch(getAveragePrices(endpoints$), initiator)
      )
      .subscribe({ complete: () => resolve(null), error: reject });
  });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
