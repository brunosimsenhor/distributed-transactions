const fs = require('fs');
const { EOL } = require('os');
const semaphore = require('semaphore');

const customInspectSymbol = Symbol.for('nodejs.util.inspect.custom');

class LogFile {
  #sem;
  #path;
  #persistent;

  constructor(path, persistent) {
    this.#path = path;
    this.#sem = semaphore(1);
    this.#persistent = !!persistent;

    // touching the log file
    if (!fs.existsSync(this.#path)) {
      fs.closeSync(fs.openSync(this.#path, 'w'));
    }
  }

  /**
   * Write down a message to the disk.
   * @param {string} message 
   */
  write(message) {
    // this is needed to assure the order of the received messages.
    this.#sem.take(() => {
      fs.appendFileSync(this.#path, message + EOL);

      this.#sem.leave();
    });
  }

  async read() {
    return await new Promise((resolve, _) => {
      this.#sem.take(() => {
        const lines = fs.readFileSync(this.#path).toString();

        this.#sem.leave();

        resolve(lines);
      });
    })
  }

  /**
   * Delete this log file from disk.
   * @returns boolean
   */
  delete() {
    if (this.#persistent) {
      return false;
    }

    return fs.unlinkSync(this.#path);
  }

  [customInspectSymbol]() {
    return `LogFile { path: ${this.#path} }`
  }
}

module.exports = LogFile;
