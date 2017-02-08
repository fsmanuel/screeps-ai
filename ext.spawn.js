const Logger = require('class.logger');
const {
  everyTicks
} = require('util.helpers');

StructureSpawn.prototype.autoSpawnCreeps = function(claimFlags) {
  if (this.spawning) { return; }

  const room = this.room;

  // Creeps governed by the spawn
  const creeps = _.toArray(Game.creeps)
    .filter(c => c.memory.spawnId === this.id);

  // Collect creeps statistic
  const counts = creeps.reduce(function(data, creep) {
    let role = creep.memory.role;

    data[role] = data[role] ? data[role] + 1 : 1;
    return data;
  }, {});

  // If no harvesters are left AND no lorries create a backup creep
  // TODO: Maybe we should check for the room?
  if (counts['harvester'] === 0 && counts['lorry'] === 0) {
    return this.createCustomCreep('harvester');
  } else {
    // Mining
    room
      .find(FIND_SOURCES)
      .forEach((source) => {
        if (typeof this.spawnForMining(source, creeps) === 'string') {
          return;
        }
      });
  }

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
        if (typeof this.spawnForMining(source, creeps) === 'string') {
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

StructureSpawn.prototype.spawnForMining = function(source, creeps) {
  let container = source.containers()[0];
  let creep;

  // No container => nothing to spawn
  if (!container) {
    return;
  }

  // if the source has no miner
  creep = this.spawnFor(source, container, creeps, 'miner');
  if (typeof creep === 'string') {
    return creep;
  }

  // if the source has no lorry
  creep = this.spawnFor(source, container, creeps, 'lorry');
  if (typeof creep === 'string') {
    return creep;
  }
};

StructureSpawn.prototype.spawnFor = function(source, container, creeps, role) {
  let hasCreep = _.some(creeps, c => {
    return c.memory.role === role && c.memory.sourceId === source.id;
  });

  if (!hasCreep) {
    return this.createCustomCreep(role, {
      sourceId: source.id,
      containerId: container.id
    });
  }
};

// Blueprints
// TODO: make it dependent on the energy
//       regenerate every X ticks or use the regeneration of the global
const creepBlueprints = Object.create(null);

// Explorer
creepBlueprints.claimer = {
  1: [],
  2: [],
  // 700
  3: [CLAIM,MOVE,MOVE],
  // 1300
  4: [CLAIM,CLAIM,MOVE,MOVE]
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

  // Error message
  } else {
    let error = spawnErrors.get(canCreate);
    msg = `Can not spawn new ${role}: ${creepName} (Error: ${error})`;
  }

  Logger.log(msg, body, JSON.stringify(memory));

  return creep;
};

StructureSpawn.prototype.creepName = function(type) {
  return `${type}-${generateId()}`;
}

function generateId() {
  return Math.random().toString(32).slice(2).substr(0, 4);
}
