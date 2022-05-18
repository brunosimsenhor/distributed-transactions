const fs = require('fs');
const { v4: uuid } = require('uuid');
const EventEmitter = require('node:events');

const customInspectSymbol = Symbol.for('nodejs.util.inspect.custom');

class Transaction extends EventEmitter {
  #id;
  #status;
  #timeout;

  static NEW = 'NEW';
  static OPEN = 'OPEN';
  static COMMITED = 'COMMITED';
  static REJECTED = 'REJECTED';

  constructor(timeout = 5000) {
    super();

    const id = uuid();

    this.#id = id;
    this.#status = this.constructor.NEW;
    this.#timeout = timeout;
  }

  status() {
    return this.#status;
  }

  isNew() {
    return this.#status === this.constructor.NEW;
  }

  isOpen() {
    return this.#status === this.constructor.OPEN;
  }

  isRejected() {
    return this.#status === this.constructor.REJECTED;
  }

  isCommited() {
    return this.#status === this.constructor.COMMITED;
  }

  id() {
    return this.#id;
  }

  // receives an array of Promises
  begin() {
    if (!this.isNew()) {
      this.#debug('already opened')
      return false;
    }

    this.#status = this.constructor.OPEN;

    // the transaction will rollback automatically after 5 seconds
    setTimeout(() => {
      if (this.isOpen()) {
        this.rollback('timeout rollback');
      }
    }, this.#timeout);

    this.emit('begin');

    return Promise.resolve();
  }

  commit() {
    if (!this.isOpen()) {
      return false;
    }

    this.#debug('commited');
    this.#status = this.constructor.COMMITED;

    this.emit('commit');

    return true;
  }

  rollback(msg) {
    if (!this.#checkOpened()) {
      throw new Error('transaction is not open');
    }

    this.#debug(`rolled back`, msg);
    this.#status = this.constructor.REJECTED;

    this.emit('rollback');

    return true;
  }

  #checkOpened() {
    if (!this.isOpen()) {
      this.#debug(`not opened: ${this.#status}`);
      return false;

    } else {
      return true;
    }
  }

  #debug(type, msg) {
    console.log('[transaction]', `[${this.#id}]`, `[${type}]`, msg !== undefined ? msg : '');
  }

  [customInspectSymbol]() {
    return `Transaction { id: ${this.#id}, status: ${this.#status} }`;
  }
}

module.exports = Transaction;
