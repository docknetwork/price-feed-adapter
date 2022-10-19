import {
  from,
  defer,
  EMPTY,
  Observable,
  timer,
  of,
  OperatorFunction,
  combineLatest,
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
import { apply, curry, o } from "ramda";

import {
  BinanceFetcher,
  CryptocompareFetcher,
  CoingeckoFetcher,
} from "./fetchers";
import {
  BasicExtrinsic,
  Pair,
  PairPrice,
  Publishable,
  PublishablePairPrice,
} from "./types";
import {
  EtherChainGasPriceFetcher,
  GasStationGasPriceFetcher,
} from "./fetchers/gas";
import { getAllAveragePrices, getPublishableAveragePrices } from "./prices";
import { batchExtrinsics, changeDecimals, pickPairPrice } from "./helpers";
import { ApiPromise } from "@polkadot/api";
import { AddressOrPair } from "@polkadot/api/types";
import { BigNumber } from "ethers";
import { formatUnits } from "ethers/lib/utils";

const DOCK_DECIMALS = 6;
const DOCK_USD = { from: "DOCK", to: "USD", decimals: 6 };
const ETH_USD = { from: "ETH", to: "USD", decimals: 4 };

async function main() {
  await dock.init({ address: process.env.DOCK_RPC_ENDPOINT });
  const initiator = dock.keyring.addFromUri(
    process.env.INITIATOR_ACCOUNT_URI
  ) as AddressOrPair;
  dock.setAccount(initiator);

  const tokenEndpoints$ = from([
    new BinanceFetcher(),
    new CryptocompareFetcher(),
    new CoingeckoFetcher(),
  ]);
  const gasEndpoints$ = from([
    new GasStationGasPriceFetcher(),
    new EtherChainGasPriceFetcher(),
  ]);

  const gasPrice$ = defer(
    () =>
      of({ from: "ETH-GAS", to: "ETH", decimals: 18 }).pipe(
        getAllAveragePrices(gasEndpoints$)
      ) as Observable<PairPrice>
  );

  const dockToUsd = {
    pair: DOCK_USD,
    publishConfig: { decimals: 4, minDiff: BigNumber.from(10) },
  };

  const pairs$ = from([
    dockToUsd,
    {
      deps: from([DOCK_USD, ETH_USD]),
      publish: (prices$: Observable<PairPrice>) => {
        const dockUsd$ = prices$.pipe(pickPairPrice(DOCK_USD));
        const ethUsd$ = prices$.pipe(pickPairPrice(ETH_USD));

        const calcGasDock = (
          dockUsd: PairPrice,
          ethUsd: PairPrice,
          gas: PairPrice
        ) => {
          const rawPrice = ethUsd.price.mul(gas.price).div(dockUsd.price);
          const decimals =
            ethUsd.pair.decimals + gas.pair.decimals - dockUsd.pair.decimals;

          return {
            price: changeDecimals(decimals, DOCK_DECIMALS, rawPrice),
            pair: {
              pair: {
                from: "ETH-GAS",
                to: "DOCK",
                decimals: DOCK_DECIMALS,
              },
              publishConfig: { decimals: 9, minDiff: BigNumber.from(1e5) },
            },
          };
        };

        return combineLatest([dockUsd$, ethUsd$, gasPrice$]).pipe(
          mapRx(apply(calcGasDock))
        );
      },
    },
  ]);

  await new Promise((resolve, reject) => {
    timer(0, +process.env.WATCH_TIME || 6e4 * 5)
      .pipe(
        mapRx(() => pairs$),
        watchDockPairs(
          dock.api,
          initiator,
          getPublishableAveragePrices(tokenEndpoints$)
        )
      )
      .subscribe({ complete: () => resolve(null), error: reject });
  });
}

/**
 * Fetches pair price from the `Dock`.
 */
const getDockPairPrice = async <A extends ApiPromise>(api: A, pair: Pair) => {
  const opt = (await api.query.priceFeedModule.prices(pair)) as any;
  if (opt.isNone) {
    return null;
  }
  const value = opt.unwrap();

  return {
    amount: BigNumber.from(value.get("amount").toString()),
    decimals: value.get("decimals"),
    blockNumber: value.get("blockNumber"),
  };
};

/**
 * Updates pair price if difference between new and current stored is greater than specified `minDiff`.
 */
const updatePairPrice = curry(
  <A extends ApiPromise>(
    api: A,
    {
      price: nextPrice,
      pair: {
        pair,
        publishConfig: { decimals, minDiff },
      },
    }: PublishablePairPrice
  ): Observable<BasicExtrinsic> =>
    from(getDockPairPrice(api, pair)).pipe(
      switchMap((curPrice) => {
        const fmtAmount = (value) => formatUnits(value, decimals);
        const nextAmount = changeDecimals(pair.decimals, decimals, nextPrice);

        console.log(
          "New price for",
          pair.from,
          "/",
          pair.to,
          ":",
          fmtAmount(nextAmount)
        );

        let shouldUpdate;
        if (curPrice == null) {
          console.log("-- No stored on-chain price found");
          shouldUpdate = true;
        } else {
          const curAmount = changeDecimals(
            curPrice.decimals,
            decimals,
            curPrice.amount
          );

          const diff = curAmount.sub(nextAmount).abs();
          shouldUpdate = diff.gte(minDiff);

          console.log("-- On-chain average is", fmtAmount(curAmount));
          console.log(
            "-- Difference is",
            fmtAmount(diff),
            "while allowed is",
            fmtAmount(minDiff)
          );
        }

        if (shouldUpdate) {
          console.log("-- Updating");

          return of(
            api.tx.priceFeedModule.setPrice(
              pair,
              nextAmount.toHexString(),
              decimals
            )
          );
        } else {
          console.log("-- Skipping");

          return EMPTY;
        }
      })
    )
);

/**
 * Watches prices for the given pairs, compares with the current stored on the `Dock` side,
 * and if change is greater than minimum, performs batched updates.
 */
const watchDockPairs = curry(
  <A extends ApiPromise>(
    api: A,
    initiator: AddressOrPair,
    fetchAverages: OperatorFunction<Publishable, PublishablePairPrice>,
    pairBuckets$: Observable<Observable<Publishable>>
  ) =>
    pairBuckets$.pipe(
      switchMap((pairs$) =>
        pairs$.pipe(
          fetchAverages,
          mergeMap(updatePairPrice(api as any)),
          batchExtrinsics(api as any, 1e3, 5),
          concatMap((tx: BasicExtrinsic) =>
            from(dock.signAndSend(tx, initiator, true) as Promise<any>).pipe(
              tap((tx) =>
                console.log(
                  "Transaction finalized at block",
                  tx.status.asFinalized.toString("hex"),
                  "with hash:",
                  tx.txHash.toString("hex")
                )
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
