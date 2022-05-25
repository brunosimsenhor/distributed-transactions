const fs = require('fs');
const LogFile = require('./log_file');

const customInspectSymbol = Symbol.for('nodejs.util.inspect.custom');

class TransactionPool {
  #transactions = [];
  #baseDir;

  constructor(baseDir) {
    this.#baseDir = baseDir;
  }

  create(transactionId) {
    return (this.#transactions[transactionId] = new LogFile(`${this.#baseDir}/${transactionId}.log`));
  }

  get(transactionId) {
    if (transactionId in this.#transactions) {
      return this.#transactions[transactionId];
    }

    throw new Error('transaction not found');
  }

  getLogs() {
    let files = fs.readdirSync(this.#baseDir).filter((f) => {
      return f.match(/.*\.log$/) !== null;
    });

    files = files.map((f) => {
      const { groups: { transactionId } } = f.match(/(?<transactionId>.*)\.log$/);

      return transactionId;
    });

    files.forEach((f) => {
      this.create(f);
    });

    return files;
  }

  [customInspectSymbol]() {
    return `TransactionPool { baseDir: '${this.#baseDir}' }`;
  }
}

module.exports = TransactionPool;
