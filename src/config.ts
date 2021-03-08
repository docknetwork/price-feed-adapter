import { Requester, logger } from '@chainlink/external-adapter';
import { util } from '@chainlink/ea-bootstrap'
import * as dotenv from 'dotenv';
import { Config, DockConfig } from './types';

dotenv.config();

// Minimum answers (from different sources) required for price feed.
export const MinimumAnswersForPriceFeed = 2;

export const makeCMCConfig = (): Config => {
  // `Requester.getDefaultConfig` is available in newer version
  // const config = Requester.getDefaultConfig(prefix, true);
  const config = getDefaultConfig('CMC');
  config.api.headers = {
    'X-CMC_PRO_API_KEY': config.apiKey,
  }
  return config;
}

export const makeConfig = (prefix = ''): Config => {
  // `Requester.getDefaultConfig` is available in newer version
  // const config = Requester.getDefaultConfig(prefix, true);
  const config = getDefaultConfig(prefix);
  return config;
}

export const makeDockConfig = (): DockConfig => {
  return {
    NODE_ENDPOINT: process.env.NODE_ENDPOINT,
    ORACLE_SK: process.env.ORACLE_SK,
    ORACLE_ADDRESS: process.env.ORACLE_ADDRESS,
    AGGREGATOR_ADDRESS: process.env.AGGREGATOR_ADDRESS,
    AGGREGATOR_ABI: JSON.parse(process.env.AGGREGATOR_ABI),
  }
}

export const minimumAnswers = (): number => {
  return parseInt(util.getEnv('MinimumAnswersForPriceFeed') as string) || MinimumAnswersForPriceFeed;
}

// Following code is copied from chainlink's ea package

/* eslint-disable @typescript-eslint/no-unused-vars */
const cloneNoSecrets = (config: Config): Config => (({ apiKey, ...o }) => o)(config)

export function getDefaultConfig(prefix = ''): Config {
  return {
    apiKey: util.getEnv('API_KEY', prefix),
    api: {
      withCredentials: true,
      timeout: parseInt(util.getEnv('API_TIMEOUT', prefix) as string) || 30000,
      headers: {
        common: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      },
    },
  }
}

export const logConfig = (config: Config): void => {
  logger.debug('Adapter configuration:', { config: config && cloneNoSecrets(config) })
  if (!config.apiKey) logger.warn('API will be rate limited without an API key.')
}
