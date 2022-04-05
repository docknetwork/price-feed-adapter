import fetch from "node-fetch";
import { Pair, GasPriceFetcher } from "../types";

export class EtherChainPriceFetcher extends GasPriceFetcher {
  static NAME = "EtherChain";

  async _fetchPrice(pair: Pair): Promise<number> {
    const response = await fetch(
      "https://www.etherchain.org/api/gasPriceOracle"
    );
    const json = await response.json();
    const price = json.currentBaseFee / 1e9;

    return price;
  }
}
