const express = require('express');
const bodyParser = require('body-parser');

const Transaction = require('./transaction');
const Participant = require('./participant');

// environment
const brokers = (process.env.BROKERS || 'broker-01:3001,broker-02:3001,broker-03:3001').split(',');

// express for http server
const app = express();

app.use(function (req, res, next) {
  console.log('[access]', `${req.method} ${req.url}`);
  next();
});

app.use(bodyParser.json());

for(const b in brokers) {
  Participant.appendParticipant(brokers[b]);
}

app.post('/messages', async function (req, res) {
  const { body: messageBody } = req;

  const trx = new Transaction(5000); // timeout

  console.log('[transaction id]', trx.id());

  const headers = {}

  if (req.header('X-Fault-Injection')) {
    headers['X-Fault-Injection'] = req.header('X-Fault-Injection');
  }

  await Participant.joinAll(trx.id());

  // starting the transaction
  trx.begin()
    // asks the participants for their votes
    .then(() => Participant.prepareAll(trx.id(), messageBody, headers))
    // commiting on success
    .then(() => trx.commit())
    // rolling back on failure
    .catch(() => trx.rollback());

  trx.on('commit', () => {
    Participant.commitAll(trx.id());
  });

  trx.on('rollback', () => {
    Participant.rollbackAll(trx.id());
  });

  /**
   * responding the client
   */

  /**
   * on commit, we respond a success to the client
   */
  trx.on('commit', () => {
    res.status(201).json({
      message: 'ack',
    });
  });

  /**
   * on rollback, we respond a failure to the client
   */
  trx.on('rollback', () => {
    res.status(400).json({
      message: 'replication error',
    });
  });
});

app.get('/status/:transactionId', (req, res) => {
  const { transactionId } = req.params;

  const status = Transaction.getTransactionStatus(transactionId);

  console.log('[coordinator]', '[checking transaction status]', `[${transactionId}]`, status);

  res.status(200).json({ status });
});

app.get('/healthz', (req, res) => res.status(204).json());

app.listen(3000, () => console.log(`Server is running on http://localhost:3000`));
