module.exports = {
  log() {
    if (Game.flags.debug) {
      console.log(...arguments);
    }
  }
};
