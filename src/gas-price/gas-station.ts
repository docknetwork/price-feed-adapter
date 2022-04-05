import fetch from "node-fetch";
import { Pair, GasPriceFetcher } from "../types";

export class GasStationPriceFetcher extends GasPriceFetcher {
  static NAME = "GasStation";

  async _fetchPrice(pair: Pair): Promise<number> {
    const response = await fetch(
      "https://ethgasstation.info/api/ethgasAPI.json"
    );
    const json = await response.json();
    const price = json.average / 1e10;

    return price;
  }
}
