import { propOr } from "ramda";
import { Pair, PairPrice } from "../types";

export class PriceFetcher {
  static NAME: string;
  static REPLACEMENTS: { [key: string]: string; __proto__: null } =
    Object.create(null);

  constructor() {}

  async fetch(pair: Pair): Promise<PairPrice> {
    const { from, to } = pair;
    const price = await this._fetchPrice({
      from: propOr(from, from, (this.constructor as any).REPLACEMENTS),
      to: propOr(to, to, (this.constructor as any).REPLACEMENTS),
    });

    return { price, pair };
  }

  async _fetchPrice(_pair: Pair): Promise<number> {
    throw new Error("Unimplemented");
  }
}

export class GasPriceFetcher extends PriceFetcher {
  constructor() {
    super();
  }

  async fetch(pair: Pair): Promise<PairPrice> {
    if (pair.from !== "GAS" || pair.to !== "ETH") {
      throw new Error("Expected GAS-ETH pair only");
    }

    return super.fetch(pair);
  }
}
