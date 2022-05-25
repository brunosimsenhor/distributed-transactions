const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const LogFile = require('./log_file');
const TransactionPool = require('./transaction_pool');

const axiosInstance = axios.create({
  headers: {
    'Content-type': 'application/json'
  },
  baseURL: `http://coordinator:3000/`,
  timeout: 5000,
});

const mainLog = new LogFile('./data/main.log', { persistent: true });

const transactionPool = new TransactionPool('./intermediate');

// checking if there are loose transactions when starting up
(async function () {
  const detachedTransactions = transactionPool.getLogs();

  if (detachedTransactions.length > 0) {
    await Promise.all(detachedTransactions.map((t) => {
      return axiosInstance.get(`/status/${t}`)
        .then(({ data: { status } }) => {
          transactionPool.create(t);

          console.log('[broker]', '[transaction status]', t, status);

          if (status === 'ROLLBACK' || status === 'NOT_FOUND') {
            transactionRollback(t);
          } else if(status === 'COMMIT') {
            transactionCommit(t);
          }
        })
        .catch((err) => {
          console.error('[broker]', '[transaction status]', t, err);
        });
    }));
  }

  return true;
})();

// express for http server
const app = express();

app.use(bodyParser.json());

app.use(function (req, res, next) {
  console.log('[access]', `${req.method} ${req.url}`);
  next();
});

app.post('/join/:transactionId', function (req, res) {
  console.log('[broker]', 'join');

  const { transactionId } = req.params;

  transactionPool.create(transactionId);

  res.status(201).json({ message: 'transaction started' });
});

app.post('/prepare/:transactionId', function (req, res) {
  console.log('[broker]', 'prepare');

  const { transactionId } = req.params;
  const message = JSON.stringify(req.body);

  try {
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

app.post('/commit/:transactionId', async function (req, res) {
  const { transactionId } = req.params;

  console.log('[broker]', 'commit', transactionId);

  try {
    transactionCommit(transactionId);

    res.status(201).json({
      message: 'commited',
    });
  } catch (err) {
    res.status(400).json({
      message: err.toString(),
    });
  }
});

app.post('/rollback/:transactionId', function (req, res) {
  console.log('[broker]', 'rollback');

  const { transactionId } = req.params;

  try {
    transactionRollback(transactionId);

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

async function transactionCommit(transactionId) {
  const logFile = transactionPool.get(transactionId);

  if (!logFile) {
    return false;
  }

  const data = await logFile.read();

  mainLog.write(data.trim());

  logFile.delete();

  return true;
}

async function transactionRollback(transactionId) {
  console.log('[broker]', '[rolling back transaction]', transactionId);

  const logFile = transactionPool.get(transactionId);

  if (!logFile) {
    return false;
  }

  logFile.delete();
}
