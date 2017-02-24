let actAsBuilder = require('role.builder');

module.exports = function() {
  let target;

  /*
   Local - (same room)
  */

  // Towers need energy - the tower manages its energy level
  if (_.isEmpty(target)) {
    target = this.pos.findClosestByPath(FIND_MY_STRUCTURES, {
      filter: (s) => {
        return s.structureType === STRUCTURE_TOWER &&
          s.energy < s.energyCapacity * s.engergyFactor;
      }
    });
  }

  // Spawns and extensions
  if (_.isEmpty(target)) {
    target = this.pos.findClosestByPath(FIND_MY_STRUCTURES, {
      filter: (s) => {
        return [
          STRUCTURE_SPAWN,
          STRUCTURE_EXTENSION,
        ].includes(s.structureType) && s.energy < s.energyCapacity
      }
    });
  }

  // Do we have a storage?
  if (_.isEmpty(target)) {
    target = this.room.storage;
  }

  // Do we have solo containers - kind of in room logistics
  const soloContainerIds = this.room.memory.soloContainerIds;

  if (_.isEmpty(target) && !_.isEmpty(soloContainerIds)) {
    let soloContainers = this.room.containers()
      .filter((c) => soloContainerIds.includes(c.id));

    target = containerWithCapacity(soloContainers);
  }

  /*
   Remote - Long distance (other room)
  */

  // Get back to home spawn
  if (_.isEmpty(target)) {
    let spawn = Game.getObjectById(this.memory.spawnId);

    // Find the room
    if (spawn && spawn.pos.roomName !== this.room.name) {
      this.moveTo(spawn, {
        reusePath: 10
      });

      return;
    }
  }

  // Support home spawn
  if (_.isEmpty(target)) {
    let spawn = Game.getObjectById(this.memory.spawnId);
    spawn = Game.getObjectById(spawn.memory.spawnId);

    // Find the room
    if (spawn && spawn.pos.roomName !== this.room.name) {
      this.moveTo(spawn, {
        reusePath: 10
      });

      return;
    }
  }

  // if we have a target lets transfer
  if (!_.isEmpty(target)) {
    this.do('transfer', target, RESOURCE_ENERGY);
  } else {
    actAsBuilder.call(this);
  }
};

function containerWithCapacity(containers) {
  return _.find(containers, c => c.store[RESOURCE_ENERGY] < c.storeCapacity);
}
