// Coinmarketcap price API

import fetch from "node-fetch";
import { Pair } from "../../types";
import { PriceFetcher } from "../price-fetcher";
import { BigNumber } from "ethers";
import { parseUnits } from "ethers/lib/utils";

export class CoinmarketcapFetcher extends PriceFetcher {
  static NAME = "Coinmarketcap";

  protected async requestPrice({ from, to }: Pair): Promise<BigNumber> {
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

    return parseUnits(String((json as any).data[from].quote[to].price));
  }
}
