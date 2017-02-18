
// Energy control
StructureTower.prototype.engergyFactor = 0.75; // 0.25 0.75

StructureTower.prototype.defend = function() {
  // find closes hostile creep

  // TODO: If no more MOVE parts let alone and kill later

  let target;

  // First attack HEAL (TODO: can be dangerous)
  target = this.pos.findClosestByRange(FIND_HOSTILE_CREEPS, {
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
    let maxWallHits = this.room.memory.maxWallHits;

    // Distribute wall repais (s.hits < 255000)
    target = this.pos.findClosestByRange(FIND_STRUCTURES, {
      filter: (s) => {
        // TODO: STRUCTURE_RAMPART should be prioritized - maybe we should switch under the maxWallHits until they reach a sustainable limit
        // return s.structureType === STRUCTURE_RAMPART && s.hits < maxWallHits

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
