// Binance price API

import fetch from "node-fetch";
import { Pair } from "../../types";
import { PriceFetcher } from "../price-fetcher";

export class BinanceFetcher extends PriceFetcher {
  static NAME = "Binance";
  static SYMBOL_REPLACEMENTS = Object.setPrototypeOf(
    {
      USD: "USDT",
    },
    null
  );

  protected async requestPrice({ from, to }: Pair): Promise<number> {
    const url = "https://api.binance.com/api/v3/ticker/price";

    const symbol = `${from}${to}`;
    const params = {
      symbol,
    };

    const result = await fetch(url + "?" + new URLSearchParams(params), {
      method: "GET",
    });
    const json = await result.json();

    return Number.parseFloat((json as any).price);
  }
}
