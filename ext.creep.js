let runList = {
  builder: require('role.builder'),
  logistics: require('role.logistics'),
  lorry: require('role.logistics'),
  upgrader: require('role.upgrader'),
  explorer: require('role.explorer'),
};

let claimerRun = require('role.claimer');
let defenderRun = require('role.defender');
let minerRun = require('role.miner');

let monkRun = require('role.monk');
let meleeRun = require('role.melee');
let destroyerRun = require('role.destroyer');
let mangudaiRun = require('role.mangudai');
let heavyBowmanRun = require('role.heavyBowman');
let lightBowmanRun = require('role.lightBowman');

const {
  rememberTo
} = require('util.helpers');

Creep.prototype.rememberTo = rememberTo;

Creep.prototype.run = function() {
  let role = this.memory.role;
  let isWorking = this.memory.working;
  let energy = this.carry.energy;
  let carry = _.sum(this.carry);

  // TODO: Every creep has to visit this every tick!
  // this.room.visitPosition(this);

  // Migrations
  // TODO: Remove after migration
  if (this.isRole('distributor')) {
    this.memory.isLocal = true;
    this.memory.task = 'distribute';
    this.memory.role = 'lorry';
  }

  // This roles have special tasks and don't need the working flag

  // Light Bowman - Run for it!
  if (this.isRole('lightBowman')) {
    lightBowmanRun.call(this);
    return;
  }

  // Heavy Bowman - Run for it!
  if (this.isRole('heavyBowman')) {
    heavyBowmanRun.call(this);
    return;
  }

  // Mangudai - Run for it!
  if (this.isRole('mangudai')) {
    mangudaiRun.call(this);
    return;
  }

  // Defender - Run for it!
  if (this.isRole('defender')) {
    defenderRun.call(this);
    return;
  }

  // monk - Run for it!
  if (this.isRole('monk')) {
    monkRun.call(this);
    return;
  }

  // melee - Run for it!
  if (this.isRole('melee')) {
    meleeRun.call(this);
    return;
  }

  // destroyer - Run for it!
  if (this.isRole('destroyer')) {
    destroyerRun.call(this);
    return;
  }

  // Claimers have special tasks
  if (this.isRole('claimer')) {
    claimerRun.call(this);
    return;
  }

  // Minors don't use the working flag because they don't need energy
  if (this.isRole('miner')) {
    minerRun.call(this);
    return;
  }

  // TODO: Move into setupRun
  if (
    isWorking !== undefined && (
      isWorking && carry === 0 ||
      !isWorking && carry === this.carryCapacity
    )
  ) {
    if (this.memory.working === true) {
      this.memory.working = false;
    } else {
      this.memory.working = true;
    }
  }

  // Aka collect energy
  if (!isWorking) {
    // Collect droped energy
    if (this.collectDroppedEnergy() === OK) {
      return;
    }

    if (
      ['mining', 'distribute'].includes(this.memory.task) &&
      this.collectDroppedResource() === OK
    ) {
      return;
    }

    // Get energy from container and source
    if (['builder', 'upgrader'].includes(role)) {
      this.getEnergy(true, false);

    // Get energy from container and source
    // TODO: It should take the closest!
    } else if (role === 'explorer') {
      this.getEnergy(true, true);

    // Get energy from source
    } else if (role === 'logistics') {
      this.getEnergy(false, true);

    // Get energy from container
    } else if (role === 'lorry') {
      let container;
      let mineral = this.room.mineral();

      if (mineral) {
        container = mineral.nearContainers()[0];
      }

      // TODO: Enable this feature to clear your terminal of minerals
      if (
        false &&
        this.memory.task === 'distribute' &&
        this.room.terminal &&
        this.room.terminal.store[mineral.mineralType] > 0
      ) {
        this.do('withdraw', this.room.terminal, mineral.mineralType);
      } else if (
        this.memory.task === 'mining' &&
        this.memory.isMineral &&
        this.room.hasExtractor() &&
        container &&
        container.store[mineral.mineralType] >= this.carryCapacity
      ) {
        this.do('withdraw', container, mineral.mineralType);
      } else {
        this.getEnergy(true, false, { containerId: this.memory.containerId });
      }

      if (_.sum(this.carry) === this.carryCapacity) {
        this.memory.working = true;
      }
    }
  }

  // Do the work
  if (isWorking && runList[role]) {
    runList[role].call(this);
  }
}

Creep.prototype.getEnergy = function(useContainer, useSource, options = {}) {
  let container;
  let amount;

  // if the Creep should look for containers
  if (useContainer) {
    let { containerId } = options;

    // Aka lorries
    if (containerId) {
      container = Game.getObjectById(containerId);

//     this.do('transfer', target, this.room.mineral().mineralType);

      // If terminal is over limit (100000)
      if (
        this.memory.task === 'distribute' &&
        this.room.terminal &&
        this.room.terminal.store[RESOURCE_ENERGY] > 100000
      ) {
        container = this.room.terminal;
      }

    // find closest container
    } else {
      const soloContainerIds = this.room.memory.soloContainerIds;
      let capacity = this.carryCapacity - _.sum(this.carry);

      if (
        this.isRole('upgrader') &&
        this.room.terminal &&
        this.room.terminal.store[RESOURCE_ENERGY] > 100000
      ) {
        container = this.room.terminal;
      } else {
        container = this.pos.findClosestByPath(FIND_STRUCTURES, {
          filter: (s) => {
            let match = [
                STRUCTURE_CONTAINER,
                STRUCTURE_STORAGE
              ].includes(s.structureType) && s.store[RESOURCE_ENERGY] >= capacity;

            // Only get energy from solo containers
            if (
              !['explorer', 'logistics'].includes(this.memory.role) &&
              s.structureType === STRUCTURE_CONTAINER
            ) {
              return match && soloContainerIds.includes(s.id);
            } else {
              return match;
            }
          }
        });
      }
    }

    // if one was found
    if (!_.isEmpty(container)) {

      // Move lorries to YELLOW flags (next to containers)
      if (this.isRole('lorry')) {
        // TODO: We should use findInReach()
        let yellowFlag = container.pos.findClosestFlag(COLOR_YELLOW);

        if (yellowFlag && !this.pos.isEqualTo(yellowFlag.pos)) {
          this.moveTo(yellowFlag);
        }

        // prevent lorries from withdraw every tick
        let capacity = this.carryCapacity - _.sum(this.carry);
        amount = capacity <= 2000 ? capacity : 2000;
      }

      // Done!
      this.do('withdraw', container, RESOURCE_ENERGY, amount);
    }
  }

  // if no container was found and the creep should look for sources
  if (_.isEmpty(container) && useSource) {
    // find closest source
    this.do('harvest', this.pos.findClosestByPath(FIND_SOURCES_ACTIVE));
  }

  if (_.isEmpty(container) && !useSource) {
    this.shouldResumeWork();
  }
};

Creep.prototype.collectDroppedEnergy = function() {
  let droppedEnergy = this.room.find(FIND_DROPPED_ENERGY, {
    filter: (d) => d.resourceType === 'energy'
  });

  if(!_.isEmpty(droppedEnergy)) {
    let energy = this.pos.findInRange(droppedEnergy, 3)[0];
    let value = this.carryCapacity / 10;
    value = value > 10 ? value : 10;

    if (energy && energy.amount > value) {
      return this.do('pickup', energy);
    }
  }
};

Creep.prototype.collectDroppedResource = function() {
  let mineral = this.pos.findInRange(FIND_DROPPED_RESOURCES, 6)[0];

  let value = this.carryCapacity / 10;
  value = value > 10 ? value : 10;

  if (mineral && mineral.amount > value) {
    return this.do('pickup', mineral);
  }
};

// TODO: Check if we still have bugs / problems with not moving creeps
Creep.prototype.shouldResumeWork = function() {
  if (!this.isRole('lorry') && _.sum(this.carry) > this.carryCapacity / 2) {
    this.memory.working = true;
    return OK;
  }
};

Creep.prototype.do = function(action, target, type = null, amount = null) {
  let task = this[action](target, type, amount);

  // Make the creep more efficient by preventing idle time
  if (action === 'withdraw' && task === ERR_NOT_ENOUGH_RESOURCES) {
    return this.shouldResumeWork();
  }

  // Enqueue logistics, miners and explorers
  if (action === 'harvest' && task === ERR_INVALID_TARGET) {
    return this.moveTo(target);
  }

  // Move to target
  if (task === ERR_NOT_IN_RANGE) {
    return this.moveTo(target);
  }

  return task;
};

Creep.prototype.isRole = function(name) {
  return this.memory.role === name;
};

Creep.prototype.isControlledBy = function(controllerId) {
  return this.memory.controllerId === controllerId;
};

Creep.prototype.getAbilityOf = function(type) {
  let boost = {
    heal : {
      'LO' : 2,
      'LHO2' : 3,
      'XLHO2' : 4
    }
  };

  let body = this.body;
  let ability = 0;

  body.forEach((element) => {
    // creeps has the bodyPart type
    if(element.type === type) {
      // with no boost
      if(_.isEmpty(element.boost)) {
        ability += 1;
      }
      // with boost
      else {
        ability += boost[element.type][element.boost];
      }
    }
  });

  return ability;
};
