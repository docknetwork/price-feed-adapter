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
  catchError,
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
import { assertFinite, batchExtrinsics } from "./helpers";

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

  const dockToUsd = { from: "DOCK", to: "USD", decimals: 4, maxDiff: 100 };

  const pairs$ = from([
    dockToUsd,
    {
      from: dockToUsd,
      to: { from: "ETH", to: "USD" },
      publish: (from$: Observable<PairPrice>, to$: Observable<PairPrice>) =>
        zip([from$, to$, gasPrice$]).pipe(
          mapRx(([dockUsd, ethUsd, gas]) => ({
            price: ((ethUsd.price * gas.price) / dockUsd.price) * 1e6,
            pair: { from: "GAS", to: "DOCK", decimals: 3, maxDiff: 1e3 },
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
 * Updates pair price if difference between the given and current stored is greater than specified `maxDiff`.
 */
const updatePairPrice = ({ price: nextPrice, pair }) =>
  from(getDockPairPrice(pair)).pipe(
    switchMap((cur) => {
      const assertAmount = assertFinite(
        () =>
          `Failed to calculate price for ${JSON.stringify(
            pair
          )}: current is ${JSON.stringify(cur)}, next is ${JSON.stringify(
            nextPrice
          )}`
      );

      const decimals = defaultTo(0, pair.decimals);
      const maxDiff = defaultTo(0, pair.maxDiff);
      const nextAmount = nextPrice * 10 ** decimals;
      assertAmount(nextAmount);

      console.log("New price for", pair.from, "/", pair.to, ":", nextPrice);

      let update;
      if (cur == null) {
        update = true;
      } else {
        const curAmount = cur.amount / 10 ** (cur.decimals - decimals);
        assertAmount(curAmount);

        const diff = Math.abs(curAmount - nextAmount);
        update = diff > maxDiff;

        console.log("-- On-chain average is", curAmount / 10 ** decimals);
        console.log(
          "-- Difference is",
          diff / 10 ** decimals,
          "while allowed is",
          maxDiff / 10 ** decimals
        );
      }

      if (update) {
        console.log("-- Updating");

        return of(
          dock.api.tx.priceFeedModule.setPrice(pair, nextAmount, decimals)
        );
      } else {
        console.log("-- Skipping");

        return EMPTY;
      }
    })
  );

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
          mergeMap(updatePairPrice),
          batchExtrinsics(dock.api, 5),
          concatMap((batch: any) =>
            from(batch.signAndSend(initiator)).pipe(
              tap((tx) =>
                console.log("Transaction sent: ", (tx.toString as any)("hex"))
              ),
              catchError((err) => {
                console.error(err);
                throw err;
              }),
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
