// Cryptocompare price API

import fetch from "node-fetch";
import { Pair } from "../../types";
import { PriceFetcher } from "../price-fetcher";
import { BigNumber } from "ethers";
import { parseUnits } from "ethers/lib/utils";

export class CryptocompareFetcher extends PriceFetcher {
  static NAME = "Cryptocompare";

  protected async requestPrice({ from, to }: Pair): Promise<BigNumber> {
    const url = "https://min-api.cryptocompare.com/data/price";

    const params = {
      fsym: from,
      tsyms: to,
    };

    const result = await fetch(url + "?" + new URLSearchParams(params), {
      method: "GET",
    });
    const json = await result.json();

    return parseUnits(String((json as any)[to]));
  }
}
