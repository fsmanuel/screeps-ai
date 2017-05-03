let actAsDistributor = require('role.distributor');

function isHomeRoom(creep) {
  let roomName = Game.getObjectById(creep.memory.controllerId).room.name;
  return creep.room.name === roomName;
}

function isRemoteRoom(creep) {
  // TODO: Remove containerId after migration
  let roomName = Game.getObjectById(
    creep.memory.targetId || creep.memory.containerId
  ).room.name;
  return creep.room.name === roomName;
}

module.exports = function() {
  let targets = [];
  let type = RESOURCE_ENERGY;

  /*
   Local - (same room)
  */

  if (isHomeRoom(this)) {
    // Mineral
    let mineral = this.room.mineral();

    if (this.carry[mineral.mineralType] > 0) {
      type = mineral.mineralType;

      targets.push(() => {
        return this.room
          .find(FIND_MY_STRUCTURES, {
            filter: (s) => {
              return [
                  STRUCTURE_STORAGE,
                  STRUCTURE_TERMINAL,
                ].includes(s.structureType) &&
                s.hasCapacity(this.carry[type]);
            }
          })[0];
      });
    } else {
      let distributors = this.room
        .find(FIND_MY_CREEPS)
        .filter((c) => {
          return c.memory.task === 'distribute';
        });

      // Act as distributor if there is none
      if (this.memory.task === 'distribute' || _.isEmpty(distributors)) {
        actAsDistributor.call(this);
        return;
      } else {
        // Targets in range
        targets.push(() => {
          let targets = this.pos.findInRange(FIND_MY_STRUCTURES, 1, {
            filter: (s) => {
              return [
                STRUCTURE_SPAWN,
                STRUCTURE_EXTENSION,
                STRUCTURE_TOWER
              ].includes(s.structureType) && s.energy < s.energyCapacity - 49
            }
          });

          return this.pos.findClosestByPath(targets);
        });

        // Storage
        targets.push(() => this.room.storage);
      }
    }
  } else if (isRemoteRoom(this)) {
    // Tower
    targets.push(() => {
      return this.pos
        .findClosestByPath(FIND_MY_STRUCTURES, {
          filter: (s) => {
            return s.structureType === STRUCTURE_TOWER &&
              s.energy < s.energyCapacity * s.engergyFactor;
          }
        });
    });

    // Solo container
    targets.push(() => {
      return this.room
        .containers()
        .filter((c) => this.room.memory.soloContainerIds.includes(c.id))
        .find((c) => c.storeCapacity - c.store[RESOURCE_ENERGY] > 500);
    });
  }

  // TODO: Optimize that we only call the function once
  let target = targets.find((target) => !_.isEmpty(target()));
  if (target) { target = target(); }
  /*
   Remote - Long distance (other room)
  */

  // Get back to home controller room
  if (!target) {
    let controller = Game.getObjectById(this.memory.controllerId);

    // Find the room
    if (
      controller &&
      controller.pos &&
      controller.pos.roomName !== this.room.name
    ) {
      this.moveTo(controller, {
        reusePath: 10
      });

      return;
    }
  }

  // if we have a target lets transfer
  if (target) {
    this.do('transfer', target, type);
  }
};
