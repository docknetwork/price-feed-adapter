// Types copied from external adapter package as that could not be imported

import { AxiosRequestConfig } from 'axios'

/* ERRORS */
type ErrorBasic = {
  name: string
  message: string
}
type ErrorFull = ErrorBasic & {
  stack: string
  cause: string
}

export type Config = {
  apiKey?: string
  network?: string
  returnRejectedPromiseOnError?: Boolean
  verbose?: boolean
  api: Partial<AxiosRequestConfig>
}

export type AdapterRequestMeta = {
  availableFunds?: number
  eligibleToSubmit?: boolean
  latestAnswer?: number
  oracleCount?: number
  paymentAmount?: number
  reportableRoundID?: number
  startedAt?: number
  timeout?: number
}
export type AdapterRequest = {
  id: string
  data: Record<string, unknown>
  meta?: AdapterRequestMeta
}

export type AdapterResponse = {
  jobRunID: string
  statusCode: number
  data: any
  result: any
}

export type AdapterErrorResponse = {
  jobRunID: string
  status: string
  statusCode: number
  error: ErrorBasic | ErrorFull
}

export type Execute = (input: AdapterRequest) => Promise<AdapterResponse>

export type ExecuteWithConfig<C extends Config> = (
  input: AdapterRequest,
  config: C,
) => Promise<AdapterResponse>

export type ExecuteFactory<C extends Config> = (config?: C) => Execute

export type ExecuteWithJobId = (input: AdapterRequest, jobRunID: string) => Promise<AdapterResponse>

export type ExecuteWithConfigAndJobId<C extends Config> = (
  input: AdapterRequest,
  config: C,
  jobRunID: string
) => Promise<AdapterResponse>

export type DockConfig = {
  // TCP endpoint of the Substrate node
  NODE_ENDPOINT: string,
  // Oracle secret key. Used when writing to chain.
  ORACLE_SK: string,
  // Oracle address. Used for reading oracle's last submission before when writing to chain.
  ORACLE_ADDRESS: string,
  // Address of the proxy contract
  PROXY_ADDRESS: string,
  // ABI of the proxy contract
  PROXY_ABI: Array<Record<string, any>>,
  // ABI of the aggregator contract
  AGGREGATOR_ABI: Array<Record<string, any>>,
}

export type PriceUpdateParams = {
  // Update with the current price no matter what
  forceWrite: boolean,
  // Current price
  currentPrice: number,
  // Threshold percentage by which price should change to trigger an update on.
  thresholdPct: number,
  // Even if current price has not deviated by threshold, trigger an update if the last timestamp where update happened is older by this number of seconds
  idleTime: number,
}