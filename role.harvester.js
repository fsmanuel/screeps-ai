let actAsBuilder = require('role.builder');

function containerWithCapacity(containers) {
  return _.find(containers, c => c.store[RESOURCE_ENERGY] < c.storeCapacity);
}

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
    // TODO: WAR - Add war mode aka factor = 1
    let factor = 0.75;

    target = this.pos.findClosestByPath(FIND_MY_STRUCTURES, {
      filter: (s) => {
        return s.structureType === STRUCTURE_TOWER &&
          s.energy < s.energyCapacity * factor;
      }
    });
  }

  // Do we have a storage?
  if (_.isEmpty(target)) {
    target = this.room.storage;
  }

  // Do we have a container next to the spawn
  // TODO: Revisit when we have 2 spawns
  if (_.isEmpty(target)) {
    let spawns = this.room.find(FIND_STRUCTURES, {
      filter: s => s.structureType === STRUCTURE_SPAWN
    });

    target = containerWithCapacity(spawns[0].containers());
  }

  // Do we have a container next to the controller
  if (_.isEmpty(target)) {
    target = containerWithCapacity(this.room.controller.containers());
  }

  // if we have a target lets transfer
  if (!_.isEmpty(target)) {
    this.do('transfer', target, RESOURCE_ENERGY);
  } else {
    actAsBuilder.call(this);
  }
};
