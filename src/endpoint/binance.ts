// Binance DOCK/USDT price API

import fetch from 'node-fetch'
import { Pair, PairPrice, PriceFetcher } from '../types';

export class BinanceFetcher extends PriceFetcher {
  static NAME = "Binance";

  async fetch(pair: Pair): Promise<PairPrice> {
    let { from, to } = pair;
    const url = "https://api.binance.com/api/v3/ticker/price";
    if (to === 'USD') {
      to = 'USDT'
    }
    const symbol = `${from}${to}`;
    const params = {
      symbol,
    };
  
    const result = await fetch(url + '?' + new URLSearchParams(params), {
      method: "GET",
    });
    const json = await result.json();

    return { price: Number.parseFloat((json as any).price), pair };
  }
}