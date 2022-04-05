import fetch from "node-fetch";
import { Pair } from "../../types";
import { GasPriceFetcher } from '../price-fetcher'

export class GasStationGasPriceFetcher extends GasPriceFetcher {
  static NAME = "GasStation";

  async _fetchPrice(_: Pair): Promise<number> {
    const response = await fetch(
      "https://ethgasstation.info/api/ethgasAPI.json"
    );
    const json = await response.json();
    const price = json.average / 1e10;

    return price;
  }
}
