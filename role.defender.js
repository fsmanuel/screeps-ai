module.exports = function() {
  let flag = Game.flags[this.memory.flagName];

  if (flag && flag.pos.roomName !== this.room.name) {
    this.moveTo(flag, {
      reusePath: 0
    });
  } else {
    // TODO: Add heal logic
    let hostileCreeps = this.room.findEnemies();
    let target = this.pos.findClosestByRange(hostileCreeps);

    if (_.isEmpty(target)) {
      this.moveTo(flag);
    }

    this.do('attack', target);
  }
};
