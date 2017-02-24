let actAsBuilder = require('role.builder');

const STRUCTURE_WALLS = [STRUCTURE_WALL, STRUCTURE_RAMPART];

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

  // Don't repair other streets!
  if (this.room.controller.level === 0 && this.room.hasConstructionSites()) {
    // We set it on autoPilot if it's a remote explorer
    let autoPilot = this.memory.flagName ? true : false;

    actAsBuilder.call(this, autoPilot);
    return;
  }

  target = Game.getObjectById(this.memory.targetId);

  // Find new target
  if (!target || target.hits === target.hitsMax) {
    const damageFactor = 0.75;
    target = this.pos.findClosestByPath(FIND_STRUCTURES, {
      filter: s => s.hits < s.hitsMax * damageFactor
    });
    // repair walls only up to value
    // explorer try to build before tower
    const maxWallHits = this.room.memory.maxWallHits + 10000;

    // Select all structures below 'damageFactor'
    // Select all walls below increased maxWallHits
    target = this.pos.findClosestByPath(FIND_STRUCTURES, {
      filter: (s) => {
        return s.hits < s.hitsMax * damageFactor &&
          !(STRUCTURE_WALLS.includes(s.structureType) && s.hits > maxWallHits);
      }
    });

    // Remember all target´s except walls
    // TODO: need for a better wall solution
    if (target && !STRUCTURE_WALLS.includes(target.structureType)) {
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
