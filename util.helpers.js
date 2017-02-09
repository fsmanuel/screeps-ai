module.exports = {
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
