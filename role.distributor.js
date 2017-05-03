module.exports = function() {
  let targets = [];

  /*
   Local - (same room)
  */

  // Towers need energy - the tower manages its energy level
  if (this.room.underAttack()) {
    targets.push(() => {
      return this.pos.findClosestByPath(FIND_MY_STRUCTURES, {
        filter: (s) => {
          return s.structureType === STRUCTURE_TOWER &&
            s.energy < s.energyCapacity * s.engergyFactor;
        }
      });
    });
  }

  // Spawns and extensions
  targets.push(() => {
    return this.pos.findClosestByPath(FIND_MY_STRUCTURES, {
      filter: (s) => {
        return [
          STRUCTURE_SPAWN,
          STRUCTURE_EXTENSION,
        ].includes(s.structureType) && s.energy < s.energyCapacity
      }
    });
  });

  // Solo container
  targets.push(() => {
    let threshold = _.sum(this.carry) * 1/3;
    let containers = this.room
      .containers()
      .filter((c) => this.room.memory.soloContainerIds.includes(c.id))
      .find((c) => c.storeCapacity - c.store[RESOURCE_ENERGY] >= threshold);

    return this.pos.findClosestByPath(containers);
  });

  // Optional per control: Do we have explorer or builder
  targets.push(() => {
    if (!this.room.memory.defense.wallContainer) {
      return this.pos.findClosestByPath(FIND_MY_CREEPS, {
        filter: (s) => {
          return (s.isRole('explorer') || s.isRole('builder')) &&
            s.carry[RESOURCE_ENERGY] < s.carryCapacity / 3;
        }
      });
    }
  });

  // Terminal
  targets.push(() => {
    if (
      this.room.terminal &&
      this.room.terminal.store[RESOURCE_ENERGY] < 100000
    ) {
      return this.room.terminal;
    }
  });

  // Storage
  targets.push(() => {
    return this.room.storage;
  });

  let target = targets.find((target) => !_.isEmpty(target()));
  if (target) { target = target(); }

  // if we have a target lets transfer
  if (target) {
    this.do('transfer', target, RESOURCE_ENERGY);
  }
};
