import {
  from,
  zip,
  defer,
  EMPTY,
  Observable,
  timer,
  of,
  OperatorFunction,
} from "rxjs";
import {
  concatMap,
  map as mapRx,
  mergeMap,
  retry,
  switchMap,
  tap,
} from "rxjs/operators";
import dock from "@docknetwork/sdk";
import { curry, defaultTo } from "ramda";
import {
  BinanceFetcher,
  CryptocompareFetcher,
  CoingeckoFetcher,
} from "./currency";
import { Pair, PairPrice } from "./types";
import { EtherChainPriceFetcher, GasStationPriceFetcher } from "./gas-price";
import { fetchAveragePrices } from "./prices";
import { batchExtrinsics } from "./helpers";

async function main() {
  await dock.init({ endpoint: process.env.DOCK_RPC_ENDPOINT });
  const initiator = dock.keyring.addFromUri(process.env.INITIATOR_ACCOUNT_URI);
  dock.setAccount(initiator);

  const tokenEndpoints$ = from([
    new BinanceFetcher(),
    new CryptocompareFetcher(),
    new CoingeckoFetcher(),
  ]);
  const gasEndpoints$ = from([
    new GasStationPriceFetcher(),
    new EtherChainPriceFetcher(),
  ]);

  const gasPrice$ = defer(
    (): Observable<PairPrice> =>
      of({ from: "GAS", to: "ETH" }).pipe(fetchAveragePrices(gasEndpoints$))
  );

  const dockToUsd = { from: "DOCK", to: "USD", decimals: 4, minDiff: 100 };

  const pairs$ = from([
    dockToUsd,
    {
      from: dockToUsd,
      to: { from: "ETH", to: "USD" },
      publish: (from$: Observable<PairPrice>, to$: Observable<PairPrice>) =>
        zip([from$, to$, gasPrice$]).pipe(
          mapRx(([dockUsd, ethUsd, gas]) => ({
            price: ((ethUsd.price * gas.price) / dockUsd.price) * 1e6,
            pair: { from: "GAS", to: "DOCK", decimals: 6, minDiff: 1e6 },
          }))
        ),
    },
  ]);

  await new Promise((resolve, reject) => {
    timer(0, +process.env.WATCH_TIME || 6e4 * 5)
      .pipe(
        mapRx(() => pairs$),
        watchDockPairs(fetchAveragePrices(tokenEndpoints$), initiator)
      )
      .subscribe({ complete: () => resolve(null), error: reject });
  });
}

/**
 * Fetches pair price from the `Dock`.
 */
const getDockPairPrice = async (pair) => {
  const opt = await dock.api.query.priceFeedModule.price(pair);
  if (opt.isNone) {
    return null;
  }
  const value = opt.unwrap();

  return {
    amount: value.get("amount"),
    decimals: value.get("decimals"),
    blockNumber: value.get("blockNumber"),
  };
};

/**
 * Watches prices for the given pairs, compares with the current stored on the `Dock` side,
 * and if change is greater than minimum, performs batched updates.
 */
const watchDockPairs = curry(
  (
    fetchAverages: OperatorFunction<Pair, PairPrice>,
    initiator: any,
    pairBuckets$: Observable<Observable<Pair>>
  ) =>
    pairBuckets$.pipe(
      switchMap((pairs$) =>
        pairs$.pipe(
          fetchAverages,
          mergeMap(({ price: avg, pair }) =>
            from(getDockPairPrice(pair)).pipe(
              switchMap((current) => {
                console.log(
                  "Pair average for",
                  pair.from,
                  "/",
                  pair.to,
                  ": ",
                  avg
                );

                const decimals = defaultTo(0, pair.decimals);
                const minDiff = defaultTo(0, pair.minDiff);

                if (
                  current == null ||
                  Math.abs(
                    current.amount / 10 ** (current.decimals - decimals) -
                      avg * 10 ** decimals
                  ) > minDiff
                ) {
                  console.log("Updating ", pair.from, "/", pair.to);
                  return of(
                    dock.api.tx.priceFeedModule.setPrice(
                      pair,
                      avg * 10 ** decimals,
                      decimals
                    )
                  );
                } else {
                  console.log("Skipping", pair.from, "/", pair.to);
                  return EMPTY;
                }
              })
            )
          ),
          batchExtrinsics(dock.api, 5),
          concatMap((batch: any) =>
            from(batch.signAndSend(initiator)).pipe(
              tap((tx) =>
                console.log("Transaction sent: ", (tx.toString as any)("hex"))
              ),
              retry(3)
            )
          )
        )
      )
    )
);

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
