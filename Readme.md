# Price feed adapter

Fetches price from exchanges, takes median and writes them to chain. All the actions are written as small tasks.

This repo holds several components:

- the adapter, which is the js module in [`./src`](./src), gets deployed to a chainlink node (by node operators) under the bridge name `dock_usd_bridge`
- the [jobspecs](#Jobspecs), which define when the adapter function get scheduled to run
- the server, which acts as a middleware for price data APIs (Coinmarketcap, Coingecko, etc.), and exposes:
  - each price data API endpoint
  - an endpoint that returns the median of all these APIs' prices

## Deploying the adapter

The default adapter is the module in [`./src`](./src).
This is for chainlink node operators to deploy on their node.

This bridge should be deployed under the name `dock_usd_bridge`.
This can be checked in the admin dashboard of the oracle's chainlink node.

### Customizing the adapter deployment

Alternatively, node operators can tweak the deployment and jobspec in the following ways:

#### To get price for DOCK/USD pair

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

#### To write price for DOCK/USD pair on chain

```js
import { execute, WRITE_CMC_PRICE, WRITE_MEDIAN_PRICE } from './adapter';

// To write coinmarketcap price
const data = await execute({ id: "1", data: {endpoint: WRITE_CMC_PRICE}}  as AdapterRequest );

// To write median price
const data = await execute({ id: "1", data: {endpoint: WRITE_MEDIAN_PRICE}}  as AdapterRequest );

// To write the price on chain when the current price has either deviated by 5% or is stale by 30 seconds
const data = await execute({ id: "1", data: {endpoint: WRITE_MEDIAN_PRICE, thresholdPct: 5, idleTime: 30}}  as AdapterRequest );
```

The `result` key of `data` will contain the block number.

## Jobspecs

There are 2 jobspecs. Each of them is initiated by a cron trigger each minute. They assume the adapter has been deployed with the bridge named `dock_usd_bridge`.  
[Spec 1](price-feed-job-spec-1.json) will always write on the chain.  
[Spec 2](price-feed-job-spec-2.json) will write on the chain when either the price deviates by 1% or 3600 seconds (1 hour) has passed.

## Running the server

```
ts-node scripts/run-server.ts
```

## Env variables

The following environment variables need to be set for the adapter to work.

```
CMC_API_KEY=<Coinmarketcap API key>
MinimumAnswersForPriceFeed = <Minimum answers (from different sources) required for price feed>
MinGasPrice = <Minimum gas price>
MaxGas = <Maximum allowed gas for a txn>
NODE_ENDPOINT=<TCP endpoint of the blockchain node>
ORACLE_SK=<Secret key for Oracle's account>
ORACLE_ADDRESS=<EVM address of the Oracle>
PROXY_ADDRESS=<EVM address of the proxy to price aggregator contract>
```
