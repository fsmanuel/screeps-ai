module.exports = {
  rememberTo(callback, condition, options) {
    const { key, limit } = options;

    // Helper
    const reset = function() { this.memory[key] = 0; };

    // Setup
    if (!this.memory[key]) { reset.call(this); }

    // Increase if condition is met or reset
    if (condition) { this.memory[key] += 1; }
    else { reset.call(this); }

    // If the limit es reached call callback and reset
    if (this.memory[key] > limit) {
      callback.call(this);

      reset.call(this);
    }
  },

  rememberToFor(callback, condition, options) {
    const { key, id, limit } = options;

    // Helper
    const reset = function() { this.memory[key][id] = 0; };

    // Setup
    if (!this.memory[key]) { this.memory[key] = {}; }
    if (!this.memory[key][id]) { reset.call(this); }

    // Increase if condition is met or reset
    if (condition) { this.memory[key][id] += 1; }
    else { reset.call(this); }

    // console.log(JSON.stringify(this.memory[key][id]));

    // If the limit es reached call callback and reset
    if (this.memory[key][id] > limit) {
      callback.call(this);

      reset.call(this);
    }
  },

  // Exec callback every X ticks
  everyTicks(amount, callback) {
    if (Game.time % amount === 0) {
      return callback();
    }
  },

  // Generate a 'uniq' id
  generateId() {
    return Math.random().toString(32).slice(2).substr(0, 4);
  }
}
