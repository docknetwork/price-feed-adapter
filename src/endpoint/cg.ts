// Coingecko DOCK/USD price API

import fetch from "node-fetch";
import { Pair, PairPrice, PriceFetcher } from "../types";

const SPECIALS = {
  ETH: "ethereum",
};

export class CoingeckoFetcher extends PriceFetcher {
  static NAME = "Coingecko";

  async fetch(pair: Pair): Promise<PairPrice> {
    let { from, to } = pair;
    from = SPECIALS[from] || from;
    to = SPECIALS[to] || to;
    const url = "https://api.coingecko.com/api/v3/simple/price";

    const params = {
      ids: from.toLowerCase(),
      vs_currencies: to.toLowerCase(),
    };

    const result = await fetch(url + "?" + new URLSearchParams(params), {
      method: "GET",
    });
    const json = await result.json();

    return {
      price: Number.parseFloat(
        (json as any)[from.toLowerCase()][to.toLowerCase()]
      ),
      pair,
    };
  }
}
