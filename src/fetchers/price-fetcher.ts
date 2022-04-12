import { propOr } from "ramda";
import { Pair, PairPrice } from "../types";

export class PriceFetcher {
  static NAME: string;
  static SYMBOL_REPLACEMENTS: { [key: string]: string; __proto__: null } =
    Object.create(null);

  constructor() {}

  async fetchPrice(pair: Pair): Promise<PairPrice> {
    const { from, to } = pair;

    const price = await this.requestPrice({
      from: this.replaceSymbol(from),
      to: this.replaceSymbol(to),
    });

    return { price, pair };
  }

  private replaceSymbol(value: string): string {
    return propOr(
      value,
      value,
      (this.constructor as typeof PriceFetcher).SYMBOL_REPLACEMENTS
    );
  }

  protected async requestPrice(_pair: Pair): Promise<number> {
    throw new Error("Unimplemented");
  }
}

export class GasPriceFetcher extends PriceFetcher {
  constructor() {
    super();
  }

  async fetchPrice(pair: Pair): Promise<PairPrice> {
    if (pair.from !== "GAS" || pair.to !== "ETH") {
      throw new Error("Expected GAS-ETH pair only");
    }

    return super.fetchPrice(pair);
  }
}
