let actAsBuilder = require('role.builder');

module.exports = function() {
  let targetId = this.memory.targetId;

  // Normal mode
  let target = Game.getObjectById(targetId);

  if (!target || target.hits === target.hitsMax) {
    let targets = this.room.find(FIND_STRUCTURES, {
      filter: s => s.hits < s.hitsMax
    });
    // targets.sort((a,b) => a.hits - b.hits);

    if (targets.length > 0) {
      target = targets[0];
      this.memory.targetId = target.id;
    } else {
      target = undefined;
    }
  }

  if (target) {
    this.do('repair', target);
  } else {
    actAsBuilder.call(this);
  }
};
