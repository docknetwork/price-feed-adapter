import { SubmittableExtrinsic } from "@polkadot/api/types";
import { Observable } from "rxjs";

export interface Pair {
  from: string;
  to: string;
  decimals?: number;
  maxDiff?: number;
}

export interface PairSource {
  deps: Observable<Pair>;
  publish: (prices: Observable<PairPrice>) => Observable<PairPrice>;
}

export interface PairPrice {
  price: number;
  pair: Pair;
}

export type BasicExtrinsic = SubmittableExtrinsic<"promise">;
