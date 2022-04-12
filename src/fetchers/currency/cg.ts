// Coingecko price API

import fetch from "node-fetch";
import { Pair } from "../../types";
import { PriceFetcher } from "../price-fetcher";

export class CoingeckoFetcher extends PriceFetcher {
  static NAME = "Coingecko";
  static SYMBOL_REPLACEMENTS = Object.setPrototypeOf(
    {
      ETH: "ethereum",
    },
    null
  );

  protected async requestPrice({ from, to }: Pair): Promise<number> {
    const url = "https://api.coingecko.com/api/v3/simple/price";

    const params = {
      ids: from.toLowerCase(),
      vs_currencies: to.toLowerCase(),
    };

    const result = await fetch(url + "?" + new URLSearchParams(params), {
      method: "GET",
    });
    const json = await result.json();

    return Number.parseFloat(
      (json as any)[from.toLowerCase()][to.toLowerCase()]
    );
  }
}
