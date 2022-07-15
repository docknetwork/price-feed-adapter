import { describe, it, expect } from "@jest/globals";
import { identity, zipObj } from "ramda";
import { combineLatest, from, lastValueFrom, map, Observable, take, toArray, tap } from "rxjs";
import {
  BinanceFetcher,
  CoingeckoFetcher,
  CryptocompareFetcher,
} from "../src/fetchers";
import {
  EtherChainGasPriceFetcher,
  GasStationGasPriceFetcher,
} from "../src/fetchers/gas";
import { PriceFetcher } from "../src/fetchers";
import { Pair, PairPrice, PublishablePairPrice } from "../src/types";
import { getPublishableAveragePrices } from "../src/prices";
import { pickPairPrice } from "../src/helpers";
import { BigNumber } from "ethers";
import { parseUnits } from "ethers/lib/utils";

class TestFetcher extends PriceFetcher {
  NAME = "TestFetcher";
  data: { [pair: string]: number };
  called: number;

  constructor(data) {
    super();
    this.called = 0;
    this.data = data;
  }

  protected async requestPrice(pair: Pair): Promise<BigNumber> {
    this.called++;
    return parseUnits(String(this.data[pair.from + pair.to]));
  }
}

const checkAverage = async (endpoints, pair, mapRes = val => val.toNumber()) => {
  const results = await Promise.all(endpoints.map((e) => e.fetchPrice(pair)));

  const avg = results.reduce(
    ({ total, count }, { price }) => ({
      total: total.add(price),
      count: count + 1,
    }),
    { total: BigNumber.from(0), count: 0 }
  );

  for (const { price } of results) {
    expect(mapRes(avg.total.div(avg.count))).toBeCloseTo(mapRes(price));
  }
};

describe("basic", () => {
  it("checks basic workflow", async () => {
    const buildPrices = () =>
      zipObj(["AB", "BC", "AB", "DB"], Array.from({ length: 4 }, () => (Math.random() * 100) | 0));
    const pricesA = buildPrices();
    const pricesB = buildPrices();

    const endpoints = [new TestFetcher(pricesA), new TestFetcher(pricesB)];

    const pairs = [
      { pair: { from: "A", to: "B", decimals: 4 }, publishConfig: { decimals: 2, minDiff: 0 } },
      { pair: { from: "B", to: "C", decimals: 4 }, publishConfig: { decimals: 2, minDiff: 0 } },
      {
        deps: from([
          { from: "A", to: "B", decimals: 4 },
          { from: "D", to: "B", decimals: 4 },
        ]),
        publish: (prices$: Observable<PairPrice>) => {
          const ab$: Observable<PairPrice> = prices$.pipe(
            pickPairPrice({ from: "A", to: "B", decimals: 4 })
          );
          const db$: Observable<PairPrice> = prices$.pipe(
            pickPairPrice({ from: "D", to: "B", decimals: 4 })
          );

          return combineLatest([ab$, db$]).pipe(
            map(([ab, db]) => ({
              price: ab.price.mul(10 ** 4).div(db.price),
              pair: { pair: { from: "A", to: "D", decimals: 4 }, publishConfig: { decimals: 2, minDiff: 0 } }
            }))
          );
        },
      },
    ];

    const prices: PublishablePairPrice[] = (await lastValueFrom(
      from(pairs).pipe(getPublishableAveragePrices(from(endpoints)), take(3), toArray())
    )) as any;

    for (const { price, pair: { pair } } of prices) {
      if (pricesA[pair.from + pair.to]) {
        expect(
          (pricesA[pair.from + pair.to] + pricesB[pair.from + pair.to]) / 2
        ).toBe(price.toNumber() / 10 ** pair.decimals);
      } else {
        expect(pair).toEqual({ from: "A", to: "D", decimals: 4 });
        expect(
          (pricesA["AB"] + pricesB["AB"]) /
            2 /
            ((pricesA["DB"] + pricesB["DB"]) / 2)
        ).toBeCloseTo(price.toNumber() / 10 ** pair.decimals);
      }
    }

    for (const endpoint of endpoints) expect(endpoint.called).toBe(3);
  });

  it("checks token endpoints", async () => {
    const endpoints = [
      new CoingeckoFetcher(),
      // Currently unused
      // new CoinmarketcapFetcher(),
      new CryptocompareFetcher(),
      new BinanceFetcher(),
    ];

    await checkAverage(endpoints, { from: "DOCK", to: "USD", decimals: 2 });
  });

  it("checks gas endpoints", async () => {
    const gasEndpoints = [
      new EtherChainGasPriceFetcher(),
      new GasStationGasPriceFetcher(),
    ];

    await checkAverage(gasEndpoints, { from: "ETH-GAS", to: "ETH", decimals: 18 }, val => val.toNumber() / 1e13);
    await expect(() =>
      checkAverage(gasEndpoints, { from: "ETH", to: "USD", decimals: 2 })
    ).rejects.toThrowError();
  });
});
