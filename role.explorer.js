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

  // Don't repair streets befor building containers
  if(this.room.controller.level === 0 && this.room.hasConstructionSites('container')) {
    // We set it on autoPilot if it's a remote explorer
    let autoPilot = this.memory.flagName ? true : false;

    actAsBuilder.call(this, autoPilot);
    return;
  }

  target = Game.getObjectById(this.memory.targetId);

  // Find new target
  if (!target || target.hits === target.hitsMax) {
    // repair structures when hits are below factor
    let damageFactor = 0.75;
    if(this.room.isColony()) {
      damageFactor = 0.25;
    }

    // repair walls only up to value
    let wallValue = 0;
    if(!_.isEmpty(this.room.memory.defense)) {
      let defense = this.room.memory.defense;
      // explorer try to build a buffer before the towers start repairing buffer size is +inreaseValue
      wallValue = defense.maxWallHits + defense.lastIncrease;
    }

    // Select all structures below 'damageFactor'
    // Select all walls & ramps below increased maxWallHits
    target = this.pos.findClosestByPath(FIND_STRUCTURES, {
      filter: (s) => {
          return (s.hits < s.hitsMax * damageFactor &&
            !((s.structureType == STRUCTURE_WALL || s.structureType == STRUCTURE_RAMPART)
            && s.hits > wallValue))
      }
    });

    // Spezial case where enemies has damage a wall under the limit
    let limitHits = wallValue - 50000;
    let heavyDamagedWalls = this.room.walls().filter((s) => s.hits < limitHits);

    if(!_.isEmpty(heavyDamagedWalls)) {
      target = heavyDamagedWalls.sort(function(a, b) {
          let aObject = a.hits;
          let bObject = b.hits;

          return aObject - aObject;
      })[0];
    }

    if (target) {
      // Remember all targets except walls & ramps
      // TODO: dont know if 'dont remember' is a good way
      if(!(target.structureType == STRUCTURE_WALL
        || target.structureType == STRUCTURE_RAMPART)) {

        this.memory.targetId = target.id;
      }
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