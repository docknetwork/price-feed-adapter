## Running the server

```
yarn start
```

## Env variables

The following environment variables need to be set for the adapter to work.

```
INITIATOR_ACCOUNT_URI=<Initiator account URI>
DOCK_RPC_ENDPOINT=<Endpoint of the Dock node>
CMC_API_KEY=<Coinmarketcap API key>
LOG_PRICE_SOURCES=<Enable debug mode to see all incoming prices and their sources>
WATCH_TIME=<Time to wait between request prices again in ms> (default to 5 min)
```
