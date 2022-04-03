// Cryptocompare DOCK/USD price API

import fetch from "node-fetch";
import { Pair, PairPrice, PriceFetcher } from "../types";

export class CryptocompareFetcher extends PriceFetcher {
  static NAME = "Cryptocompare";

  async fetch(pair: Pair): Promise<PairPrice> {
    const { from, to } = pair;
    const url = "https://min-api.cryptocompare.com/data/price";

    const params = {
      fsym: from,
      tsyms: to,
    };

    const result = await fetch(url + "?" + new URLSearchParams(params), {
      method: "GET",
    });
    const json = await result.json();

    return { price: Number.parseFloat((json as any)[to]), pair };
  }
}
