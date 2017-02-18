let actAsBuilder = require('role.builder');

module.exports = function() {
  let target = Game.flags[this.memory.flagName];;

  // Long distance (other room)
  if (target && target.pos.roomName !== this.room.name) {
    this.moveTo(target, {
      reusePath: 10
    });

    return;
  }

  // Default (same room)
  target = Game.getObjectById(this.memory.targetId);

  // Find new target
  if (!target || target.hits === target.hitsMax) {
    const damageFactor = 0.75;
    target = this.pos.findClosestByPath(FIND_STRUCTURES, {
      filter: s => s.hits < s.hitsMax * damageFactor
    });

    if (target) {
      this.memory.targetId = target.id;
    }
  }

  if (target) {
    this.do('repair', target);
  } else {
    // We set it on autoPilot if it's a remote explorer
    let autoPilot = this.memory.flagName ? true : false;

    actAsBuilder.call(this, autoPilot);
  }
};
