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
  NODE_ENDPOINT: string,
  ORACLE_SK: string,
  ORACLE_ADDRESS: string,
  AGGREGATOR_ADDRESS: string,
  AGGREGATOR_ABI: object,
}