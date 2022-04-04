import fetch from "node-fetch";
import { Pair, PairPrice, PriceFetcher } from "../types";

export class EtherChainPriceFetcher extends PriceFetcher {
  static NAME = "EtherChain";

  async fetch(pair: Pair): Promise<PairPrice> {
    if (pair.from !== "GAS" || pair.to !== "ETH") {
      throw new Error("Expected ETH-GAS pair only");
    }

    const response = await fetch(
      "https://www.etherchain.org/api/gasPriceOracle"
    );
    const json = await response.json();
    const price = json.currentBaseFee / 1e9;

    return { price, pair };
  }
}
