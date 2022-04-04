import fetch from "node-fetch";
import { Pair, PairPrice, PriceFetcher } from "../types";

export class GasStationPriceFetcher extends PriceFetcher {
  static NAME = "GasStation";

  async fetch(pair: Pair): Promise<PairPrice> {
    if (pair.from !== "GAS" || pair.to !== "ETH") {
      throw new Error("Expected ETH-GAS pair only");
    }

    const response = await fetch(
      "https://ethgasstation.info/api/ethgasAPI.json"
    );
    const json = await response.json();
    const price = json.average / 1e10;

    return { price, pair };
  }
}
