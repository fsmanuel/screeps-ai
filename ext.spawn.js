const Logger = require('class.logger');

let desiredPopulation =

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

StructureSpawn.prototype.autoSpawnCreeps = function() {
  if (this.spawning) { return; }

  const room = this.room;
  // TODO: We should bind a creep to the spawn
  const creeps = room.find(FIND_MY_CREEPS);

  // Collect creeps statistic
  // TODO: Write into memory refresh every X ticks
  const creepsWithRole = creeps.reduce(function(data, creep) {
    let role = creep.memory.role;

    data[role] = data[role] ? data[role] + 1 : 1;
    return data;
  }, {});

  // TODO: show every 20 ticks
  // Logger.log(JSON.stringify(creepsWithRole));

  // if no harvesters are left AND either no miners or no lorries are left
  //  create a backup creep
  if (creepsWithRole['harvester'] === 0 && creepsWithRole['lorry'] === 0) {
    return this.createCustomCreep('harvester');
  } else {
    // check if all sources have miners and lorries
    for (let source of room.find(FIND_SOURCES)) {
      // check whether or not the source has a container
      let containers = source.containers();

      if (containers.length > 0) {
        // if the source has no miner
        if (this.spawnFor(source, containers[0], creeps, 'miner') === OK) {
          return;
        }

        // if the source has no lorry
        if (this.spawnFor(source, containers[0], creeps, 'lorry') === OK) {
          return;
        }
      }
    }
  }

  // Maintain default creeps population
  _.each(this.desiredPopulation(), (max, role) => {
    // Logger.log(role, creepsWithRole[role], max, creepsWithRole[role] < max);

    if (creepsWithRole[role] < max || !creepsWithRole[role]) {
      this.createCustomCreep(role);
    }
  });
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
creepBlueprints.explorer = {
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
    working: false
  }, options);

  let creep;
  let canCreate = this.canCreateCreep(body, creepName);
  let msg;

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
