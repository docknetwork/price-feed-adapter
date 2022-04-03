// The commented code does call the execute function but the curl call blocks. Aparrently in the middleware `withStatusCode`, the await blocks.
/* import all from '../src';

all.server(); */


import express from 'express';
import {execute} from '../src/adapter';

const port = process.env.EA_PORT || 8080

const app = express()
app.use(express.text())


app.post('/', async(req, res) => {
  if (!req.is('application/json')) {
    return res
      .status(415)
      .send('Only application/json media type is supported.')
  }
  const resp = await execute(req.body);
  res.status(resp.statusCode).json(resp)
})

app.listen(port, (err: Error) => {
  if (err) return console.error(err)
  return console.log(`Server is listening on port:${port}`)
})