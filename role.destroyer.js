module.exports = function() {
  let flag = Game.flags[this.memory.flagName];

  if (flag && flag.pos.roomName !== this.room.name) {
    this.moveTo(flag, {
      reusePath: 0
    });
  } else {
    let radius = 0;// flag.memory.radius;
    let target;

    if (radius === 0) {
      target = flag.pos.lookFor(LOOK_STRUCTURES)[0];
    } else {
      // TODO: Should be only enemies structures
      let targets = flag.pos.findInRange(FIND_STRUCTURES, radius);
      target = targets[0] //this.pos.findClosestByPath(targets);
    }

    if (_.isEmpty(target)) {
      this.moveTo(flag);
    } else {
      this.do('dismantle', target);
    }
  }

};