let actAsBuilder = require('role.builder');

module.exports = function() {
  let target = this.pos.findClosestByPath(FIND_MY_STRUCTURES, {
    filter: (s) => {
      return [
        STRUCTURE_SPAWN,
        STRUCTURE_EXTENSION,
      ].includes(s.structureType) && s.energy < s.energyCapacity
    }
  });

  // Towers should be refilled if they are half empty
  if (_.isEmpty(target)) {
    // TODO: Add war mode aka factor = 1
    let factor = 2;

    target = this.pos.findClosestByPath(FIND_MY_STRUCTURES, {
      filter: (s) => {
        return s.structureType === STRUCTURE_TOWER &&
          s.energy < s.energyCapacity / factor;
      }
    });
  }

  // Do we have a storage?
  if (_.isEmpty(target)) {
    target = this.room.storage;
  }

  // Do we have a container next to the spawn
  if (_.isEmpty(target)) {
    let spawns = this.room.find(FIND_STRUCTURES, {
      filter: s => s.structureType === STRUCTURE_SPAWN
    });
    let containers = spawns[0].containers();

    target = _.find(
      containers,
      (s) => s.store[RESOURCE_ENERGY] < s.storeCapacity
    );
  }

  // Do we have a container next to the controller
  if (_.isEmpty(target)) {
    let containers = this.room.controller.containers();

    target = _.find(
      containers,
      (s) => s.store[RESOURCE_ENERGY] < s.storeCapacity
    );
  }

  // if we have a target lets transfer
  if (!_.isEmpty(target)) {
    this.do('transfer', target, RESOURCE_ENERGY);
  } else {
    actAsBuilder.call(this);
  }
};
