const Logger = require('class.logger');
const {
  everyTicks,
  generateId
} = require('util.helpers');

StructureSpawn.prototype.autoSpawnCreeps = function(claimFlags, defendFlags) {
  if (this.spawning) { return; }

  const room = this.room;

  // Creeps governed by the spawn
  this.creeps = _.toArray(Game.creeps)
    .filter(c => c.memory.spawnId === this.id);

  // Collect creeps statistic
  const counts = this.creeps.reduce(function(data, creep) {
    let role = creep.memory.role;

    data[role] = data[role] ? data[role] + 1 : 1;
    return data;
  }, {});

  // We run it every 2 ticks to spawn other creeps as well
  everyTicks(2, () => {
    if (!_.isEmpty(defendFlags)) {
      defendFlags.forEach((flag) => {
        let options = {
          flagName: flag.name
        };

        creep = this.spawnFor('defender', options, 3);
        if (typeof creep === 'string') {
          return creep;
        }
      });

      console.log('Ui! We have to defend our selfs');
    }
  });

  // If no harvesters are left AND no lorries create a backup creep
  // TODO: Maybe we should check for the room?
  if (counts['harvester'] === 0 && counts['lorry'] === 0) {
    return this.createCustomCreep('harvester');
  }

  // Mining
  room
    .find(FIND_SOURCES)
    .forEach((source) => {
      if (typeof this.spawnForMining(source) === 'string') {
        return;
      }
    });

  // Maintain default creeps population (controlled by flags)
  _.each(this.desiredPopulation(), (max, role) => {
    if (counts[role] < max || !counts[role]) {
      return this.createCustomCreep(role);
    }
  });

  // Create a claimer every 1000 ticks
  // It's unreliable because we can miss the tick if we already spawn
  everyTicks(1000, () => this.createCustomCreep('claimer'));

  // Check for claimed rooms
  everyTicks(10, () => {
    // Mining
    claimFlags
      .reduce((sources, flag) => {
        return sources.concat(flag.room.find(FIND_SOURCES));
      }, [])
      .forEach((source) => {
        if (typeof this.spawnForMining(source, 2) === 'string') {
          return;
        }
      });
  });
};

StructureSpawn.prototype.desiredPopulation = function() {
  const flags = this.room.find(FIND_FLAGS, {
    filter: f => f.color === COLOR_GREY && f.secondaryColor === COLOR_GREEN
  });

  let population = flags.reduce(function(data, flag) {
    let [role, amount] = flag.name.split('-');

    data[role] = parseInt(amount);
    return data;
  }, {});

  // Logger.log(JSON.stringify(population));

  return population;
};

StructureSpawn.prototype.spawnForMining = function(source, lorriesCount) {
  let creep;
  let container = source.containers()[0];

  // No container => nothing to spawn
  if (!container) {
    return;
  }

  let options = {
    sourceId: source.id,
    containerId: container.id
  };

  // if the source has no miner
  creep = this.spawnFor('miner', options);
  if (typeof creep === 'string') {
    return creep;
  }

  // if the source has no lorry
  creep = this.spawnFor('lorry', options, lorriesCount);
  if (typeof creep === 'string') {
    return creep;
  }
};

StructureSpawn.prototype.spawnFor = function(role, options, limit = 1) {
  let keys = Object.keys(options);

  // We apply all options to the filter
  let creeps = this
    .creeps
    .filter(c => c.memory.role === role)
    .filter(c => keys.map(k => c.memory[k] === options[k]).every(v => v))

  if (creeps.length < limit) {
    return this.createCustomCreep(role, options);
  }
};

// Blueprints
// TODO: make it dependent on the energy
//       regenerate every X ticks or use the regeneration of the global
const creepBlueprints = Object.create(null);

// Claimer
creepBlueprints.claimer = {
  1: [],
  2: [],
  // 700
  3: [CLAIM,MOVE,MOVE],
  // 1300
  4: [CLAIM,CLAIM,MOVE,MOVE]
};

// Defender
creepBlueprints.defender = {
  1: [],
  2: [],
  // 390
  3: [
    ATTACK, ATTACK, ATTACK,
    MOVE,   MOVE,   MOVE
  ],
  // 810
  4: [
    TOUGH,  TOUGH,  TOUGH,
    ATTACK, ATTACK, ATTACK,
    ATTACK, ATTACK, ATTACK,
    MOVE,   MOVE,   MOVE,
    MOVE,   MOVE,   MOVE
  ]
};

// Lorry
creepBlueprints.lorry = {
  1: [],
  // 450
  2: [
    CARRY, CARRY, CARRY,
    CARRY, CARRY, CARRY,
    MOVE,  MOVE,  MOVE
  ],
  // 600
  3: [
    CARRY, CARRY, CARRY, CARRY,
    CARRY, CARRY, CARRY, CARRY,
    MOVE,  MOVE,  MOVE,  MOVE
  ],
  // 750
  4: [
    CARRY, CARRY, CARRY, CARRY, CARRY,
    CARRY, CARRY, CARRY, CARRY, CARRY,
    MOVE,  MOVE,  MOVE,  MOVE,  MOVE
  ]
};

// TODO: For local miners we don't need so much MOVE parts
// Miner
creepBlueprints.miner = {
  1: [],
  // TODO: should be more body parts
  // TODO: check if we need the CARRY part
  // TODO: In level 2 we need 4 body [WORK, WORK, WORK, MOVE] parts for miner...
  // 500
  2: [WORK, WORK, WORK, WORK, CARRY, MOVE],
  // 700
  3: [WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE],
  // 700
  4: [WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE]
};

// Default strategy
const maxEnergyForBalancedCreepMap = new Map([
  [1, 300],
  [2, 400],
  [3, 800],
  [4, 1000]
]);

// Body builder
StructureSpawn.prototype.bodyFor = function(role) {
  const level = this.room.controller.level;
  const blueprintsForRole = creepBlueprints[role];
  let body;

  // Use blueprint if available
  if (blueprintsForRole) {
    body = creepBlueprints[role][level];

    // Fallback to previous level
    if (!body) {
      body = creepBlueprints[role][level - 1];
    }

  // Create a balanced body
  } else {
    let energyForBalancedCreep = maxEnergyForBalancedCreepMap.get(level);
    let energyCapacityAvailable = this.room.energyCapacityAvailable;

    if (energyForBalancedCreep > energyCapacityAvailable) {
      energyForBalancedCreep = energyCapacityAvailable;
    }

    // create a balanced body with max 50 parts
    let parts = Math.floor(energyForBalancedCreep / 200);
    parts = Math.min(parts, Math.floor(50 / 3));

    body = [];
    for (let i = 0; i < parts; i++) {
      body.push(WORK);
      body.push(CARRY);
      body.push(MOVE);
    }
  }

  return body;
}


// Factory

const spawnErrors = new Map([
  [-1,  'ERR_NOT_OWNER'],
  [-3,  'ERR_NAME_EXISTS'],
  [-4,  'ERR_BUSY'],
  [-6,  'ERR_NOT_ENOUGH_ENERGY'],
  [-10, 'ERR_INVALID_ARGS'],
  [-14, 'ERR_RCL_NOT_ENOUGH'],
]);



StructureSpawn.prototype.createCustomCreep = function(role, options = {}) {
  if (this.spawning) { return; }

  const body = this.bodyFor(role);
  const creepName = this.creepName(role);
  // TODO: Only set working property if needed
  // not for claimer, defender and miner
  const memory = _.assign({
    role,
    working: false,
    spawnId: this.id
  }, options);

  let msg;
  let creep;
  let canCreate = this.canCreateCreep(body, creepName);

  // Spawn
  if (canCreate === OK) {
    msg = 'Spawning new ' + role + ': ' + creepName;
    creep = this.createCreep(body, creepName, memory);

    // body,
    Logger.log(msg, JSON.stringify(memory));
  }

  // Error message
  // } else {
  //   let error = spawnErrors.get(canCreate);
  //   msg = `Can not spawn new ${role}: ${creepName} (Error: ${error})`;
  // }

  return creep;
};

StructureSpawn.prototype.creepName = function(type) {
  return `${type}-${generateId()}`;
}
