import { BigNumber } from "ethers/lib/ethers";
import { parseUnits } from "ethers/lib/utils";
import fetch from "node-fetch";
import { Pair } from "../../types";
import { GasPriceFetcher } from "../price-fetcher";

export class EtherChainGasPriceFetcher extends GasPriceFetcher {
  static NAME = "EtherChain";

  protected async requestPrice(_: Pair): Promise<BigNumber> {
    const response = await fetch(
      "https://www.etherchain.org/api/gasPriceOracle"
    );
    const json = await response.json();

    return parseUnits(String(json.currentBaseFee)).div(1e9);
  }
}
