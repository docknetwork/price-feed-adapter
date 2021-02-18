import { expose } from '@chainlink/ea-bootstrap';
import { execute } from './adapter';
import { makeConfig } from './config';
import { AdapterRequest } from './types';

const NAME = 'DOCK';

export = { NAME, makeConfig, ...expose(execute) }
