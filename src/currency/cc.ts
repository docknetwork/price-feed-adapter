// Cryptocompare DOCK/USD price API

import fetch from "node-fetch";
import { Pair, PriceFetcher } from "../types";

export class CryptocompareFetcher extends PriceFetcher {
  static NAME = "Cryptocompare";

  async _fetchPrice({ from, to }: Pair): Promise<number> {
    const url = "https://min-api.cryptocompare.com/data/price";

    const params = {
      fsym: from,
      tsyms: to,
    };

    const result = await fetch(url + "?" + new URLSearchParams(params), {
      method: "GET",
    });
    const json = await result.json();

    return Number.parseFloat((json as any)[to]);
  }
}
