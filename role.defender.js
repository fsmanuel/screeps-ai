module.exports = function() {
  let target = Game.flags[this.memory.flagName];

  if (target && target.pos.roomName !== this.room.name) {
    this.moveTo(target, {
      reusePath: 10
    });
  } else {
    // TODO: Add heal logic
    target = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS);

    this.do('attack', target);
  }

};
