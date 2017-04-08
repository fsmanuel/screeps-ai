// Destroyer
let actAsBuilder = require('role.builder');

module.exports = function() {
  let flag = Game.flags[this.memory.flagName];
  let commando = flag.memory;

  if (flag && flag.pos.roomName !== this.room.name) {
    this.moveTo(flag, {
      reusePath: 10
    });
  } else {
    if(commando.operate) {
      let target;

      if(commando.tacticInfo.radius == 0) {
          if (_.isEmpty(target)) {
              target = flag.pos.lookFor(LOOK_STRUCTURES)[0];
          }
      } else {
          let targets = flag.pos.findInRange(FIND_STRUCTURES, commando.tacticInfo.radius);
          target = this.pos.findClosestByPath(targets);
      }

      if(this.dismantle(target) == ERR_NOT_IN_RANGE) {
          this.moveTo(target);
      }

      if (_.isEmpty(target)) {
        this.moveTo(flag);
      }
    } else {
      this.moveTo(flag);

      //TODO:
      //let autoPilot = true;
      //actAsBuilder.call(this, autoPilot);
    }
  }
};