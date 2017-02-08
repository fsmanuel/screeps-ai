module.exports = {
  everyTicks(amount, callback) {
    if (Game.time % amount === 0) {
      return callback();
    }
  }
}
