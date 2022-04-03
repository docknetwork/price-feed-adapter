import { Observable } from "rxjs";

export interface Pair {
    from: string,
    to: string,
    multiplier: number
}

export interface PairSource {
    from: Pair,
    to: Pair,
    publish: (from: Observable<PairPrice>, to: Observable<PairPrice>) => Observable<PairPrice>
}

export interface PairPrice {
    price: number,
    pair: Pair
}

export class PriceFetcher {
    static NAME: string;

    constructor() {}

    async fetch(_pair: Pair): Promise<PairPrice> {
        throw new Error('Unimplemented')
    }
}