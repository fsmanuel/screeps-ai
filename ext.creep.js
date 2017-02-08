let runList = {
  builder: require('role.builder'),
  harvester: require('role.harvester'),
  lorry: require('role.harvester'),
  janitor: require('role.janitor'),
  upgrader: require('role.upgrader')
};

let minerRun = require('role.miner');
let explorerRun = require('role.explorer');

Creep.prototype.run = function() {
  let role = this.memory.role;
  let isWorking = this.memory.working;
  let energy = this.carry.energy;

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

  // Minors don't use the working flag because they don't need energy
  if (this.isRole('miner')) {
    minerRun.call(this);
    return;
  }

  // Explorers have special tasks
  if (this.isRole('explorer')) {
    explorerRun.call(this);
    return;
  }

  // console.log(role, isWorking);

  // Aka collect energy
  if (!isWorking) {
    // Collect droped energy
    if (this.collectDroppedEnergy() === OK) {
      return;
    }

    if (['builder', 'janitor', 'upgrader'].includes(role)) {
      // Get energy from container and source
      this.getEnergy(true, false, { flag: COLOR_GREEN });
      this.getEnergy(true, true);
    } else if (role === 'harvester') {
      // Get energy from source
      this.getEnergy(false, true);
    } else if (role === 'lorry') {
      // Get energy from container
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
  let flag;

  // if the Creep should look for containers
  if (useContainer) {
    if (options.containerId) {
      container = Game.getObjectById(options.containerId);
    } else {
      // find closest container
      container = this.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (s) => {
          return [
            STRUCTURE_CONTAINER,
            STRUCTURE_STORAGE
          ].includes(s.structureType) && s.store[RESOURCE_ENERGY] > 0;
        }
      });

      if (!_.isEmpty(container) && options.flag) {
        flag = container.pos.findClosestFlag(options.flag);

        if (flag && !flag.pos.isEqualTo(container.pos)) {
          container = undefined;
        }
      }
    }

    // if one was found
    if (!_.isEmpty(container)) {
      if (this.memory.role === 'lorry') {
        flag = container.pos.findClosestFlag(COLOR_YELLOW);

        if (flag && !this.pos.isEqualTo(flag.pos)) {
          this.moveTo(flag);
        }
      }

      this.do('withdraw', container, RESOURCE_ENERGY);
    }
  }

  // if no container was found and the Creep should look for Sources
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

  // Enqueue harvester
  if (action === 'harvest' && task === ERR_INVALID_TARGET) {
    let flag = this.pos.findClosestFlag(COLOR_YELLOW, COLOR_GREEN);
    let path = this.pos.findPathTo(flag);

    if (path.length > 0) {
      return this.move(path[0].direction);
    }
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
