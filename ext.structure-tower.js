StructureTower.prototype.defend = function() {
  // find closes hostile creep

  // TODO: If no more MOVE parts let alone and kill later

  // First attack HEAL
  let target = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS, {
    filter: (enemy) => enemy.getActiveBodyparts(HEAL) > 0
  });

  // Then go for RANGED_ATTACK or ATTACK
  if (!target) {
    target = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS, {
      filter: (enemy) => {
        return enemy.getActiveBodyparts(RANGED_ATTACK) > 0 ||
          enemy.getActiveBodyparts(ATTACK) > 0
      }
    });
  }

  // Then go for RANGED_ATTACK or ATTACK
  if (!target) {
    target = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
  }

  // Attack!
  if (target) {
    this.attack(target);
  } else {
    let maxWallHits = Memory.maxWallHits;

    // Distribute wall repais (s.hits < 255000)
    target = this.pos.findClosestByRange(FIND_STRUCTURES, {
      filter: (s) => {
        if ([
          STRUCTURE_RAMPART,
          STRUCTURE_WALL
        ].includes(s.structureType)) {
          return s.hits < maxWallHits && s.hits < s.hitsMax;
        } else {
          return s.hits < s.hitsMax;
        }
      }
    });

    if (target) {
      this.repair(target);
    }
  }
};
