const axios = require('axios');

const customInspectSymbol = Symbol.for('nodejs.util.inspect.custom');

class Participant {
  #host;
  #axios;

  static #participants = {};

  constructor(host) {
    this.#host = host;
    this.#axios = axios.create({
      headers: {
        'Content-type': 'application/json'
      },
      baseURL: `http://${host}/`,
      timeout: 5000,
    });
  }

  /**
   * Append a new participant to the group.
   * @param {string} host
   */
  static appendParticipant(host) {
    const participant = new this(host);

    return (this.#participants[host] = participant);
  }

  static listParticipants() {
    return this.#participants;
  }

  static #iterateThrough() {
    return Object.values(this.#participants);
  }

  static async joinAll(transactionId) {
    const promiseArr = this.#iterateThrough().map((b) => b.join(transactionId));

    return await Promise.all(promiseArr);
  }

  static prepareAll(transactionId, message, headers) {
    const promiseArr = this.#iterateThrough().map((b) => b.prepare(transactionId, message, headers));

    return Promise.all(promiseArr);
  }

  static commitAll(transactionId) {
    const promiseArr = this.#iterateThrough().map((b) => b.commit(transactionId));

    return Promise.all(promiseArr);
  }

  static rollbackAll(transactionId) {
    const promiseArr = this.#iterateThrough().map((b) => b.rollback(transactionId));

    return Promise.all(promiseArr);
  }

  join(transactionId) {
    return this.#axios.post(`/join/${transactionId}`)
      .then(() => this.#debug('join success'))
      .catch((err) => {
        this.#treatAxiosError('join failure', err)
        throw err;
      });
  }

  prepare(transactionId, message, headers) {
    return this.#axios.post(`/prepare/${transactionId}`, message, { headers })
      .then(() => this.#debug('prepare success'))
      .catch((err) => {
        this.#treatAxiosError('prepare failure', err)
        throw err;
      });
  }

  commit(transactionId) {
    return this.#axios.post(`/commit/${transactionId}`)
      .then(() => this.#debug('commit success'))
      .catch((err) => {
        this.#treatAxiosError('commit failure', err)
        throw err;
      });
  }

  rollback(transactionId) {
    return this.#axios.post(`/rollback/${transactionId}`)
      .then(() => this.#debug('rollback success'))
      .catch((err) => {
        this.#treatAxiosError('rollback failure', err)
        throw err;
      });
  }

  #treatAxiosError(type, err) {
    // const { response: { data: { message } } } = err;
    let message;

    if (err.response && err.response.data.message) {
      message = err.response.data.message;

    } else {
      message = err.message;
    }

    this.#debug(type, message);
  }

  #debug(type, msg) {
    console.log('[participant]', `[${this.#host}]`, `[${type}]`, msg !== undefined ? msg : '');
  }

  [customInspectSymbol]() {
    return `Participant { host: ${this.#host} }`;
  }
}

module.exports = Participant;
