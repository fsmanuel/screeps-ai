let runList = {
  builder: require('role.builder'),
  logistics: require('role.logistics'),
  lorry: require('role.logistics'),
  upgrader: require('role.upgrader'),
  explorer: require('role.explorer')
};

let claimerRun = require('role.claimer');
let defenderRun = require('role.defender');
let minerRun = require('role.miner');

const {
  rememberTo
} = require('util.helpers');

Creep.prototype.rememberTo = rememberTo;

Creep.prototype.run = function() {
  let role = this.memory.role;
  let isWorking = this.memory.working;
  let energy = this.carry.energy;

  // This roles have special tasks and don't need the working flag

  // Defender - Run for it!
  if (this.isRole('defender')) {
    defenderRun.call(this);
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
      isWorking && energy === 0 ||
      !isWorking && energy === this.carryCapacity
    )
  ) {
    if (this.memory.working === true) {
      this.memory.working = false;
    } else {
      this.memory.working = true;
    }
  }

  // console.log(role, isWorking);

  // Aka collect energy
  if (!isWorking) {
    // Collect droped energy
    if (this.collectDroppedEnergy() === OK) {
      return;
    }

    // Get energy from container and source
    if (['builder', 'upgrader'].includes(role)) {
      this.getEnergy(true, false, { flag: COLOR_GREEN });

    // Get energy from container and source
    // TODO: It should take the closest!
    } else if (role === 'explorer') {
      this.getEnergy(true, true);

    // Get energy from source
    } else if (role === 'logistics') {
      this.getEnergy(false, true);

    // Get energy from container
    } else if (role === 'lorry') {
      this.getEnergy(true, false, { containerId: this.memory.containerId });
    }
  }

  // Do the work
  if (isWorking && runList[role]) {
    runList[role].call(this);
  }
}

Creep.prototype.getEnergy = function(useContainer, useSource, options = {}) {
  let container;

  // if the Creep should look for containers
  if (useContainer) {
    let { flag } = options;

    // Aka lorries
    if (options.containerId) {
      container = Game.getObjectById(options.containerId);

    // find closest container
    } else {
      container = this.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (s) => {
          let match = [
              STRUCTURE_CONTAINER,
              STRUCTURE_STORAGE
            ].includes(s.structureType) && s.store[RESOURCE_ENERGY] > 0;

          // If we should use a flagged container
          if (options.flag) {
            return match && s.hasFlag(options.flag);
          } else {
            return match;
          }
        }
      });
    }

    // if one was found
    if (!_.isEmpty(container)) {

      // Move lorries to YELLOW flags (next to containers)
      if (this.isRole('lorry')) {
        // TODO: We should use findInReach()
        let yellowFlag = container.pos.findClosestFlag(COLOR_YELLOW);

        if (yellowFlag && !this.pos.isEqualTo(yellowFlag.pos)) {
          this.moveTo(flag);
        }
      }

      // Done!
      this.do('withdraw', container, RESOURCE_ENERGY);
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
  let energy = this.pos.findInRange(FIND_DROPPED_ENERGY, 3)[0];

  if (energy && energy.amount > 10) {
    return this.do('pickup', energy);
  }
};

// TODO: Check if we still have bugs / problems with not moving creeps
Creep.prototype.shouldResumeWork = function() {
  if (!this.isRole('lorry') && _.sum(this.carry) > this.carryCapacity / 2) {
    this.memory.working = true;
    return OK;
  }
};

Creep.prototype.do = function(action, target, type = null) {
  let task = this[action](target, type);

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
