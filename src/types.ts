import { SubmittableExtrinsic } from "@polkadot/api/types";
import { Observable, OperatorFunction } from "rxjs";

export interface Pair {
  from: string;
  to: string;
  decimals?: number;
  maxDiff?: number;
}

export interface PairSource {
  deps: Observable<Pair>;
  publish: OperatorFunction<PairPrice, PairPrice>;
}

export interface PairPrice {
  price: number;
  pair: Pair;
}

export type BasicExtrinsic = SubmittableExtrinsic<"promise">;