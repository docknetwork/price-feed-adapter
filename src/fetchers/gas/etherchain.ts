import fetch from "node-fetch";
import { Pair } from "../../types";
import { GasPriceFetcher } from "../price-fetcher";

export class EtherChainGasPriceFetcher extends GasPriceFetcher {
  static NAME = "EtherChain";

  protected async requestPrice(_: Pair): Promise<number> {
    const response = await fetch(
      "https://www.etherchain.org/api/gasPriceOracle"
    );
    const json = await response.json();
    const price = json.currentBaseFee / 1e9;

    return price;
  }
}
