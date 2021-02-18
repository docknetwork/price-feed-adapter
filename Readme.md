# Price feed adapter

Fetches price from exchanges, takes median and writes them to chain. All the actions are written as small tasks.

## To get price for DOCK/USD pair

```js
import { execute } from './adapter';
import { coinmarketcap } from './endpoint';
import { coingecko } from './endpoint';

// Get price from coinmarketcap
const data = await execute({ id: "1", data: {endpoint: coinmarketcap.NAME}}  as AdapterRequest );

// Get price from coingecko
const data = await execute({ id: "1", data: {endpoint: coingecko.NAME}}  as AdapterRequest );

// To get median price from multiple exchanges, the choice of exchanges is hardcoded in code
import { MEDIAN_PRICE } from './adapter';
const data = await execute({ id: "1", data: {endpoint: MEDIAN_PRICE}}  as AdapterRequest );
```

The `result` key of `data` will contain the price.


## To write price for DOCK/USD pair on chain

```js
import { execute, WRITE_CMC_PRICE, WRITE_MEDIAN_PRICE } from './adapter';

// To write coinmarketcap price
const data = await execute({ id: "1", data: {endpoint: WRITE_CMC_PRICE}}  as AdapterRequest );

// To write median price
const data = await execute({ id: "1", data: {endpoint: WRITE_MEDIAN_PRICE}}  as AdapterRequest );
```

The `result` key of `data` will contain the block number.
