module.exports = function() {
  let target;

  /*
   Local - (same room)
  */

  // carrys minerals
  // TODO: this works only for distributors which carry the minreal type of this room
  if(this.carry[this.room.mineral().mineralType] > 0) {
    // first
    target = this.room.find(FIND_MY_STRUCTURES, {
      filter: (s) => {
        return s.structureType === STRUCTURE_TERMINAL &&
          s.hasCapacity(this.carry[this.room.mineral().mineralType]);
      }
    })[0];

    if(_.isEmpty(target)) {
      target = this.room.find(FIND_MY_STRUCTURES, {
        filter: (s) => {
          return s.structureType === STRUCTURE_STORAGE &&
            s.hasCapacity(this.carry[this.room.mineral().mineralType]);
        }
      })[0];
    }

    this.do('transfer', target, this.room.mineral().mineralType);
    return;
  }

  let underAttack = this.room.underAttack();

  // If we are NOT under attack priorise spawn and extensions
  if (_.isEmpty(target) && !underAttack) {
    target = this.pos.findClosestByPath(FIND_MY_STRUCTURES, {
      filter: (s) => {
        return [
          STRUCTURE_SPAWN,
          STRUCTURE_EXTENSION,
        ].includes(s.structureType) && s.energy < s.energyCapacity
      }
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
      filter: (s) => {
        return [
          STRUCTURE_SPAWN,
          STRUCTURE_EXTENSION,
        ].includes(s.structureType) && s.energy < s.energyCapacity
      }
    });
  }

  // Do we have solo containers - kind of in room logistics
  const soloContainerIds = this.room.memory.soloContainerIds;

  if (_.isEmpty(target) && !_.isEmpty(soloContainerIds)) {

    let soloContainers = this.room.containers()
      .filter((c) => {
        return soloContainerIds.includes(c.id)
          && c.storeCapacity - c.store[RESOURCE_ENERGY] >= _.sum(this.carry) * 1/3
    });

    target = this.pos.findClosestByPath(soloContainers);
  }

  // Optional per control: Do we have explorer or builder
  if (_.isEmpty(target) && !this.room.memory.defense.wallContainer) {
    target = this.pos.findClosestByPath(FIND_MY_CREEPS, {
      filter: (s) => {
        return ( (s.isRole('explorer') || s.isRole('builder'))
          && s.carry[RESOURCE_ENERGY] < s.carryCapacity / 3)
      }
    });
  }

  //Overspill goes in terminal (and later labs)
  if (_.isEmpty(target) && !_.isEmpty(this.room.terminal)) {
    if(this.room.terminal.store[RESOURCE_ENERGY] < 100000) {
      target = this.room.terminal;
    }
  }

  // Rest go back in storage
  if (_.isEmpty(target)) { // && this.carry[RESOURCE_ENERGY] != this.carryCapacity
    target = this.room.storage;
  }

  // if we have a target lets transfer
  if (!_.isEmpty(target)) {
    this.do('transfer', target, RESOURCE_ENERGY);
  } else {
    // TODO: Check this
    //actAsBuilder.call(this);
  }
};

function containerWithCapacity(containers, amount = 1) {
  return containers.find(
    c => c.storeCapacity - c.store[RESOURCE_ENERGY] > amount
  );
}