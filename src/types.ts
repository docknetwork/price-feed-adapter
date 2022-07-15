import { SubmittableExtrinsic } from "@polkadot/api/types";
import { BigNumber } from "ethers";
import { Observable, OperatorFunction } from "rxjs";

/** Standard pair. */
export interface Pair {
  from: string;
  to: string;
  decimals: number;
}

/** Describes how and when the pair should be published */
export interface PublishConfig {
  decimals: number;
  minDiff: BigNumber;
}

/** Describes a pair that should be published. */
export interface PublishablePair {
  pair: Pair;
  publishConfig: PublishConfig;
}

/** Describes a pair having some dependencies that should be published. */
export interface PublishablePairSource {
  deps: Observable<Pair>;
  publish: OperatorFunction<PairPrice, PublishablePairPrice>;
}

/** Defines pair price. */
export interface PairPrice {
  price: BigNumber;
  pair: Pair;
}

/** Defines pair price to be published. */
export interface PublishablePairPrice {
  price: BigNumber;
  pair: PublishablePair;
}

/** Basic extrinsic type. */
export type BasicExtrinsic = SubmittableExtrinsic<"promise">;

/** Either pair or pair source to be published */
export type Publishable = PublishablePair | PublishablePairSource;
