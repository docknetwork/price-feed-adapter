import { BigNumber } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import fetch from "node-fetch";
import { Pair } from "../../types";
import { GasPriceFetcher } from "../price-fetcher";

export class GasStationGasPriceFetcher extends GasPriceFetcher {
  static NAME = "GasStation";

  protected async requestPrice(_: Pair): Promise<BigNumber> {
    const response = await fetch(
      "https://ethgasstation.info/api/ethgasAPI.json"
    );
    const json = await response.json();

    return parseUnits(String(json.average)).div(1e10);
  }
}
