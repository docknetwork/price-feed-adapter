import { describe, it, expect } from "@jest/globals";
import { zipObj } from "ramda";
import {
  from,
  lastValueFrom,
  map,
  Observable,
  take,
  toArray,
  zip,
} from "rxjs";
import {
  BinanceFetcher,
  CoingeckoFetcher,
  CryptocompareFetcher,
} from "../src/currency";
import {
  EtherChainPriceFetcher,
  GasStationPriceFetcher,
} from "../src/gas-price";
import { fetchAveragePrices } from "../src/prices";
import { Pair, PairPrice, PriceFetcher } from "../src/types";

class TestFetcher extends PriceFetcher {
  NAME = "TestFetcher";
  data: { [pair: string]: number };
  called: number;

  constructor(data) {
    super();
    this.called = 0;
    this.data = data;
  }

  async _fetchPrice(pair: Pair): Promise<number> {
    return this.data[pair.from + pair.to];
  }
}

const checkAverage = async (endpoints, pair) => {
  const results = await Promise.all(
    endpoints.map((e) => e.fetch(pair))
  );

  const avg = results.reduce(
    ({ total, count }, { price }) => ({
      total: total + price,
      count: count + 1,
    }),
    { total: 0, count: 0 }
  );

  for (const { price } of results) {
    expect(avg.total / avg.count).toBeCloseTo(price);
  }
};

describe("basic", () => {
  it("checks basic workflow", async () => {
    const buildPrices = () =>
      zipObj(["AB", "BC", "AB", "DB"], Array.from({ length: 4 }, Math.random));
    const pricesA = buildPrices();
    const pricesB = buildPrices();

    const endpoints = [new TestFetcher(pricesA), new TestFetcher(pricesB)];

    const pairs = [
      { from: "A", to: "B" },
      { from: "B", to: "C" },
      {
        from: { from: "A", to: "B" },
        to: { from: "D", to: "B" },
        publish: (ab$: Observable<PairPrice>, de$: Observable<PairPrice>) =>
          zip([ab$, de$]).pipe(
            map(([ab, de]) => ({
              price: ab.price / de.price,
              pair: { from: "A", to: "D" },
            }))
          ),
      },
    ];

    const prices: PairPrice[] = (await lastValueFrom(
      from(pairs).pipe(fetchAveragePrices(from(endpoints)), take(3), toArray())
    )) as any;

    for (const { price, pair } of prices) {
      if (pricesA[pair.from + pair.to]) {
        expect(
          (pricesA[pair.from + pair.to] + pricesB[pair.from + pair.to]) / 2
        ).toBe(price);
      } else {
        expect(pair).toEqual({ from: "A", to: "D" });
        expect(
          (pricesA["AB"] + pricesB["AB"]) /
            2 /
            ((pricesA["DB"] + pricesB["DB"]) / 2)
        ).toBe(price);
      }
    }
  });

  it("checks token endpoints", async () => {
    const endpoints = [
      new CoingeckoFetcher(),
      // Currently unused
      // new CoinmarketcapFetcher(),
      new CryptocompareFetcher(),
      new BinanceFetcher(),
    ];

    await checkAverage(endpoints, { from: "DOCK", to: "USD" });
  });

  it("checks gas endpoints", async () => {
    const gasEndpoints = [
      new EtherChainPriceFetcher(),
      new GasStationPriceFetcher(),
    ];

    await checkAverage(gasEndpoints, { from: "GAS", to: "ETH" });
    await expect(() => checkAverage(gasEndpoints, { from: "ETH", to: "USD" })).rejects.toThrowError();
  });
});
