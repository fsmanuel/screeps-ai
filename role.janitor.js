let actAsBuilder = require('role.builder');

module.exports = function() {
  let target = Game.getObjectById(this.memory.targetId);

  // Find new target
  if (!target || target.hits === target.hitsMax) {
    target = this.pos.findClosestByPath(FIND_STRUCTURES, {
      filter: s => s.hits < s.hitsMax * 0.9
    });

    if (target) {
      this.memory.targetId = target.id;
    }
  }

  if (target) {
    this.do('repair', target);
  } else {
    actAsBuilder.call(this);
  }
};
