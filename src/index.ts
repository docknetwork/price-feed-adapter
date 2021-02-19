import { expose } from '@chainlink/ea-bootstrap';
import { execute, makeExecute } from './adapter';
import { makeConfig } from './config';

const NAME = 'DOCK';

export = { NAME, makeConfig, ...expose(execute) }
// export = { NAME, makeConfig, ...expose(makeExecute) }