let actAsBuilder = require('role.builder');

module.exports = function() {
  let target;

  /*
   Local - (same room)
  */

  let underAttack = this.room.underAttack();

  // Define the home
  let homeName = Game.getObjectById(this.memory.controllerId).room.name;
  // Define the claim
  let claimName;
  let source = Game.getObjectById(this.memory.sourceId);
  // Only lorry are having sourceIds
  if (source && source.room && this.isRole('lorry')) {
    claimName = source.room;
  }

  // Rooms which are not home or claim become no energy supply
  // TODO: exeptions are thinkable
  if ([homeName, claimName].includes(this.room.name)) {

    // If we are NOT under attack priorise spawn and extensions
    if (_.isEmpty(target) && !underAttack) {
      target = this.pos.findClosestByPath(FIND_MY_STRUCTURES, {
        filter: spawnAndExtensionsFilter
      });
    }

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
        filter: spawnAndExtensionsFilter
      });
    }

    // Do we have solo containers - kind of in room logistics
    const soloContainerIds = this.room.memory.soloContainerIds;

    if (_.isEmpty(target) && !_.isEmpty(soloContainerIds)) {
      // How much free capacity must the container have
      let carriedEnergy = this.carry[RESOURCE_ENERGY];
      let amount = carriedEnergy + carriedEnergy / 3;

      let soloContainers = this.room.containers()
        .filter((c) => soloContainerIds.includes(c.id));

      let targets = containersWithCapacity(soloContainers, amount);

      // Select the nearest container
      if (!_.isEmpty(targets)) {
        target = this.pos.findClosestByPath(targets);
      }
    }

    // Do we have a storage? (only in HOME)
    if (_.isEmpty(target) && this.room.name === homeName) {
      target = this.room.storage;
    }
  }

  /*
   Remote - Long distance (other room)
  */

  // Get back to home controller room
  if (_.isEmpty(target)) {
    let controller = Game.getObjectById(this.memory.controllerId);

    // Find the room
    if (controller && controller.pos.roomName !== this.room.name) {
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
    actAsBuilder.call(this);
  }
};

function spawnAndExtensionsFilter(s) {
  return [
    STRUCTURE_SPAWN,
    STRUCTURE_EXTENSION,
  ].includes(s.structureType) && s.energy < s.energyCapacity;
}

function containersWithCapacity(containers, amount = 1) {
  return containers.filter(
    c => c.storeCapacity - c.store[RESOURCE_ENERGY] > amount
  );
}
