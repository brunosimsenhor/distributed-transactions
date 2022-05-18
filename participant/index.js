const express = require('express');
const bodyParser = require('body-parser');

const LogFile = require('./log_file');
const TransactionPool = require('./transaction_pool');

const mainLog = new LogFile('./data/main.log', { persistent: true });

const transactionPool = new TransactionPool('./intermediate');

// express for http server
const app = express();

app.use(bodyParser.json());

app.use(function (req, res, next) {
  console.log('[access]', `${req.method} ${req.url}`);
  next();
});

app.post('/join/:transactionId', function(req, res) {
  console.log('[broker]', 'join');

  const { transactionId } = req.params;

  transactionPool.create(transactionId);

  res.status(201).json({ message: 'transaction started' });
});

app.post('/prepare/:transactionId', function(req, res) {
  console.log('[broker]', 'prepare');

  try {
    const { transactionId } = req.params;
    const message = JSON.stringify(req.body);

    logFile = transactionPool.get(transactionId);
    logFile.write(message);

    if (req.header('X-Fault-Injection') === process.env.HOSTNAME) {
      res.status(400).json({
        message: 'fault injection',
      });
    } else {
      res.status(201).json({
        message: 'ack',
      });
    }
  } catch (err) {
    res.status(400).json({
      message: err.toString(),
    });
  }
});

app.post('/commit/:transactionId', async function(req, res) {
  const { transactionId } = req.params;

  console.log('[broker]', 'commit', transactionId);

  try {
    logFile = transactionPool.get(transactionId);
    const data = await logFile.read();

    mainLog.write(data.trim());

    logFile.delete();

    res.status(201).json({
      message: 'commited',
    });
  } catch (err) {
    res.status(400).json({
      message: err.toString(),
    });
  }
});

app.post('/rollback/:transactionId', function(req, res) {
  console.log('[broker]', 'rollback');

  const { transactionId } = req.params;

  // console.log({ req, res });

  try {
    logFile = transactionPool.get(transactionId);
    logFile.delete();

    res.status(200).json({
      message: 'rolled back',
    });
  } catch (err) {
    res.status(400).json({
      message: err.toString(),
    });
  }
});

app.listen(3001, () => console.log(`Server is running on http://localhost:3001`));
