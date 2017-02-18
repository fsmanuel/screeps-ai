module.exports = function() {
  let flag = Game.flags[this.memory.flagName];

  if (flag && flag.pos.roomName !== this.room.name) {
    this.moveTo(flag, {
      reusePath: 0
    });
  } else {
    // TODO: Add heal logic
    target = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS);

    // if (_.isEmpty(target)) {
    //   // STRUCTURE_WALL
    //   let t = flag.pos.lookFor(LOOK_STRUCTURES);
    //   console.log(JSON.stringify(t));
    // }

    if (_.isEmpty(target)) {
      target = this.pos.findClosestByRange(FIND_HOSTILE_SPAWNS);
    }

    this.do('attack', target);
  }

};
