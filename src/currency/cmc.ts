// Coinmarketcap DOCK/USD price API

import fetch from "node-fetch";
import { Pair, PriceFetcher } from "../types";

export class CoinmarketcapFetcher extends PriceFetcher {
  static NAME = "Coinmarketcap";

  async _fetchPrice({ from, to }: Pair): Promise<number> {
    const url =
      "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest";

    const params = {
      symbol: from,
      convert: to,
    };

    const result = await fetch(url + "?" + new URLSearchParams(params), {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-CMC_PRO_API_KEY": process.env.CMC_API_KEY,
      },
    });
    const json = await result.json();

    return Number.parseFloat((json as any).data[from].quote[to].price);
  }
}