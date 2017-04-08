// Energy control
StructureTower.prototype.engergyFactor = 0.5; // 0.25 0.75

StructureTower.prototype.repairInRoom = function() {
  // stop repairing if energy is under level
  if(this.energy < this.energyCapacity * this.engergyFactor) { return; }

  // structure hits has to fall under the maximal tower reapair capability
  const maxRepairValue = 800 * this.room.towers().length;
  let maxWallHits = this.room.memory.defense.maxWallHits;

  let targets = this.room.find(FIND_STRUCTURES, {
    filter: (s) => {
      if ([
        STRUCTURE_RAMPART,
        STRUCTURE_WALL
      ].includes(s.structureType)) {
        return s.hits < maxWallHits && s.hits < s.hitsMax;
      } else {
        return s.hitsMax - s.hits >= maxRepairValue;
      }
    }
  }).sort(sortByHits);

  target = this.pos.findClosestByRange(targets);

  if (target) {
    this.repair(target);
  }
};

StructureTower.prototype.attackInRoom = function(options = {}) {
  let target;
  let targets = this.room.findEnemies().sort(sortByHits);

  // default: attack enemy with lowest hits
  if(_.isEmpty(options)) {
    target = this.pos.findClosestByRange(targets);

    this.attack(target);

  //attack spezial targets from fire-control
  } else {
    // attack priorized targets
    if(!_.isEmpty(options.priorized)) {
      let prio = options.priorized;

      // attack the lowest hits target, not the nerarest TODO: good solution?
      target = targets.find((target) => target.getActiveBodyparts(prio) > 0);
    }

    // attack a selected targets
    if(!_.isEmpty(options.selected)) {
      //TODO
    }

    // if no spezial target can found, attack the nearest other
    if(_.isEmpty(target)) {
      target = this.pos.findClosestByRange(targets);
    }

    this.attack(target);
  }
};

let sortByHits = function(a, b) {
  let aObject = a.hits;
  let bObject = b.hits;

  return aObject - bObject;
};
