import { BigNumber } from "@ethersproject/bignumber";
import { propOr } from "ramda";
import { changeDecimals } from "../helpers";
import { Pair, PairPrice } from "../types";

export class PriceFetcher {
  static NAME: string;
  static SYMBOL_REPLACEMENTS: { [key: string]: string; __proto__: null } =
    Object.create(null);

  constructor() {}

  /** Fetches price for the given pair. */
  async fetchPrice(pair: Pair): Promise<PairPrice> {
    const { from, to, decimals } = pair;

    const fixedPrice = await this.requestPrice({
      from: this.replaceSymbol(from),
      to: this.replaceSymbol(to),
      decimals,
    });

    const price = changeDecimals(18, decimals, fixedPrice);

    return { price, pair };
  }

  private replaceSymbol(value: string): string {
    return propOr(
      value,
      value,
      (this.constructor as typeof PriceFetcher).SYMBOL_REPLACEMENTS
    );
  }

  protected async requestPrice(_pair: Pair): Promise<BigNumber> {
    throw new Error("Unimplemented");
  }
}

export class GasPriceFetcher extends PriceFetcher {
  constructor() {
    super();
  }

  /** Fetches Ethereum gas price. */
  async fetchPrice(pair: Pair): Promise<PairPrice> {
    if (pair.from !== "ETH-GAS" || pair.to !== "ETH") {
      throw new Error("Expected ETH-GAS/ETH pair only");
    }

    return super.fetchPrice(pair);
  }
}
