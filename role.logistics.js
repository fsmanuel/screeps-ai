let actAsDistributor = require('role.distributor');
let actAsBuilder = require('role.builder');

module.exports = function() {
  let target;

  /*
   Local - (same room)
  */

  // Define the home
  let homeName = Game.getObjectById(this.memory.controllerId).room.name;
  // Define the claim
  let claimName;
  let source = Game.getObjectById(this.memory.sourceId);
  // Only lorries have sourceIds
  if (source && source.room && this.isRole('lorry')) {
    claimName = source.room.name;
  }

  // Rooms which are not home or claim become no energy supply
  // HOME Room
  if(this.room.name === homeName) {
    let hasDistributor = function(room) {
      return !_.isEmpty(room.find(FIND_MY_CREEPS).filter((c) => c.memory.role === 'distributor'));
    };

    let isLocalLogistic = function(creep) {
      // TODO: refactor
      let creepsSource = Game.getObjectById(creep.memory.sourceId)
      return creep.room.find(FIND_SOURCES).includes(creepsSource);
    }

    // act as distributor if creep is local logistic
    // or for all remote logistics, if there is no distributor in home room
    if((!hasDistributor(this.room) || isLocalLogistic(this))) {
      actAsDistributor.call(this);
    }
    // transport the energy on fast way
    else {
      // TODO: Why returns this snippet realy stange results?

      // only check for targets in range
      // let test = this.pos.findInRange(FIND_MY_STRUCTURES, 1, {
      //   filter: (s) => {
      //     return [
      //       STRUCTURE_SPAWN,
      //       STRUCTURE_EXTENSION,
      //       STRUCTURE_TOWER
      //     ].includes(s.structureType) && s.energy < s.energyCapacity - 49
      //   }
      // }[0]);

      // and bring the energy to storage
      if(_.isEmpty(target)) {
        target = this.room.storage;
      }
    }
  }
  // CLAIM Room
  else if(this.room.name === claimName) {
    // TODO: This needs a complete review

    // Spawns and extensions
    // if (_.isEmpty(target)) {
    //   target = this.pos.findClosestByPath(FIND_MY_STRUCTURES, {
    //     filter: (s) => {
    //       return [
    //         STRUCTURE_SPAWN,
    //         STRUCTURE_EXTENSION,
    //       ].includes(s.structureType) && s.energy < s.energyCapacity
    //     }
    //   });
    // }

    // fill solo containers with energy
    const soloContainerIds = this.room.memory.soloContainerIds;

    if (_.isEmpty(target) && !_.isEmpty(soloContainerIds)) {
      let soloContainers = this.room.containers()
        .filter((c) => soloContainerIds.includes(c.id));

      target = containerWithCapacity(soloContainers);
    }
  }

  /*
   Remote - Long distance (other room)
  */

  // Get back to home controller room
  if (_.isEmpty(target)) {
    let controller = Game.getObjectById(this.memory.controllerId);

    // Find the room
    if (controller && controller.pos && controller.pos.roomName !== this.room.name) {
      this.moveTo(controller, {
        reusePath: 10
      });

      return;
    }
  }

  // if we have a target lets transfer
  if (!_.isEmpty(target)) {
    this.do('transfer', target, RESOURCE_ENERGY);
  } else {
    //TODO: why does this make problems?
    //actAsBuilder.call(this);
  }
};

function containerWithCapacity(containers, amount = 1) {
  return containers.find(
    c => c.storeCapacity - c.store[RESOURCE_ENERGY] > amount
  );
}
