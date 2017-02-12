const Logger = require('class.logger');
const {
  everyTicks,
  generateId
} = require('util.helpers');

// The autoSpawn
// TODO: think about what role needs to be checked every X ticks!
StructureSpawn.prototype.autoSpawnCreeps = function(claimFlags, defendFlags) {
  if (this.spawning) { return; }

  let newCreep;
  const level = this.room.controller.level;

  /*
    Local (same room)
  */

  // Survive
  newCreep = this.maintainSurvival();
  if (newCreep) { return; }

  // Military complex (defendFlags)
  newCreep = this.militaryComplex(defendFlags);
  if (newCreep) { return; }

  // Mining
  newCreep = this.maintainLocalMining();
  if (newCreep) { return; }

  // Explorer
  newCreep = this.maintainLocalExplorer();
  if (newCreep) { return; }

  // Logistics
  newCreep = this.maintainLocalLogistics();
  if (newCreep) { return; }

  // Builder
  newCreep = this.maintainLocalBuilder();
  if (newCreep) { return; }

  // Builder
  newCreep = this.maintainLocalUpgrader();
  if (newCreep) { return; }

  /*
    Remote (claimed rooms)
  */

  // Only spawns with a controller level 3 can maintain colonies
  if (level < 3) { return; }

  // Filter claimFlags for this spawn
  const ownedClaimFlags = claimFlags.filter(f => f.memory.spawnId === this.id);

  // Claimer
  newCreep = this.claimColonies(claimFlags);
  if (newCreep) { return; }

  // Remote explorer
  newCreep = this.maintainRemoteExplorer(ownedClaimFlags);
  if (newCreep) { return; }

  // Remote mining
  newCreep = this.maintainRemoteMining(ownedClaimFlags);
  if (newCreep) { return; }
};


/*
 Local
*/

// If no logistics are left AND no lorries create a backup creep
// TODO: Maybe we should check for lorry if its source is in the room?
StructureSpawn.prototype.maintainSurvival = function() {
  const counts = this.creepsCounts;

  if (counts['logistics'] === 0 && counts['lorry'] === 0) {
    // TODO: Use spawnFor?
    return this.createCustomCreep('logistics');
  }

  // If we have a RED flag but no defenders and no tower we help our selfs
  if (
    this.hasFlag(COLOR_RED) &&
    counts['defender'] === 0 &&
    !this.room.hasTowers()
  ) {
    return this.spawnFor('defender');
  }
};

// Military complex
// We run it every 2 ticks to spawn other creeps as well
StructureSpawn.prototype.militaryComplex = function(defendFlags) {
  return everyTicks(2, () => {
    if (_.isEmpty(defendFlags)) { return; }

    return defendFlags
      .reduce((creep, flag) => {
        if (creep) { return creep; }

        let options = { flagName: flag.name };

        // TODO: make it dependend on the enemeies
        return this.spawnFor('defender', options, 2);
      }, undefined);

    console.log('Ui! We have to defend our selfs');
  });
};

// Mining (max 2 sources = 2 loops)
StructureSpawn.prototype.maintainLocalMining = function() {
  return this.room
    .find(FIND_SOURCES)
    .reduce((creep, source) => {
      if (creep) { return creep; }

      return this.spawnForMining(source);
    }, undefined);
};

// Builder
// TODO: 1-3 builders depending on construction sites (do we get the progress? volume to be build?)
// TODO: if we have a local explorer we should decrease limit by 1
StructureSpawn.prototype.maintainLocalBuilder = function() {
  let limit = 1;
  return this.spawnFor('builder', {}, limit);
};

// Logistics
StructureSpawn.prototype.maintainLocalLogistics = function() {
  let limit = 4;
  let sources = this.room.find(FIND_SOURCES)

  // If we have 1 soureces with a container we need 2
  if (sources.some(s => s.nearContainers().length === 1)) {
    limit = 2;
  }

  // If we have 2 sources with a container we don't need logistics
  if (sources.every(s => s.nearContainers().length === 1)) {
    limit = 0;
  }

  return this.spawnFor('logistics', {}, limit);
};

// Explorer
StructureSpawn.prototype.maintainLocalExplorer = function() {
  let limit = 1;
  let towers = this.room.towers();

  // If we have a tower we don't need an explorer
  if (towers.length > 0) {
    limit = 0;
  }

  return this.spawnFor('explorer', {}, limit);
};

// Upgrader
// TODO revisit the limit
StructureSpawn.prototype.maintainLocalUpgrader = function() {
  const level = this.room.controller.level;
  let limit = level;

  // If we hit level 4 we have the builder as support
  if (level > 3) {
    // In level 5 the best limit is 2 maybe we can increase on level 6
    limit = 2;
  }

  return this.spawnFor('upgrader', {}, limit);
};


/*
 Remote
*/

// Claimer
StructureSpawn.prototype.claimColonies = function(claimFlags) {
  return everyTicks(10, () => {
    return claimFlags
      .reduce((creep, flag) => {
        if (creep) { return creep; }

        // If the flag is owned by another spawn we don't care
        if (flag.memory.spawnId !== this.id) { return creep; }

        // If the controller is claimed we don't care
        if (flag.room.controller.my && !flag.room.controller.reservation) {
          return creep;
        }

        let options = { flagName: flag.name };
        let limit = 2;

        if (this.room.energyCapacityAvailable >= 1300) {
          limit = 1;
        }

        return this.spawnFor('claimer', options);
      }, undefined);
  });
};

// Explorer
StructureSpawn.prototype.maintainRemoteExplorer = function(claimFlags) {
  return everyTicks(10, () => {
    return claimFlags
      .reduce((creep, flag) => {
        if (creep) { return creep; }

        let limit = 1;
        let options = { flagName: flag.name };
        let containers = flag.room.containers();

        // If we don't have 2 containers => increase
        if (containers.length < 2) {
          limit += 1;
        }

        // If we have are GREEN => increase
        if (flag.secondaryColor === COLOR_GREEN) {
          limit += 1;

          // If we have no spawns => increase
          if (!flag.room.hasSpawns()) {
            limit += 1;
          }
        }

        return this.spawnFor('explorer', options, limit);
      }, undefined);
  });
};

// Mining
StructureSpawn.prototype.maintainRemoteMining = function(claimFlags) {
  return everyTicks(10, () => {
    return claimFlags
      .reduce((creep, flag) => {
        if (creep) { return creep; }

        let limits = {
          miner: 1,
          lorry: 2
        };
        let containers = flag.room.containers();

        // If flag room has two miner we don't need to support them anymore
        if (flag.room.hasSpawns()) {
          let spawn = flag.room.spawns()[0];

          if (spawn.creepsCounts['miner'] >= 2) {
            limits.miner = 0;
          }
        }

        // We support a claimed colony with 3 containers with 1 lorry
        if (flag.secondaryColor === COLOR_GREEN && containers.length >= 3) {
          limits.lorry = 1;
        }

        flag.room
          .find(FIND_SOURCES)
          .reduce((creep, source) => {
            if (creep) { return creep; }

            return this.spawnForMining(source, limits);
          }, undefined);
      }, undefined);
  });
};


/*
 Helpers
*/

// Creeps governed by the spawn
StructureSpawn.prototype.collectCreepsData = function() {
  // Get all creeps
  this.creeps = _
    .toArray(Game.creeps)
    .filter(c => c.memory.spawnId === this.id);

  // Collect creeps statistics
  this.creepsCounts = this.creeps.reduce(function(data, creep) {
    let role = creep.memory.role;

    data[role] = data[role] ? data[role] + 1 : 1;
    return data;
  }, {});
};

// Mining
StructureSpawn.prototype.spawnForMining = function(source, limits = {}) {
  let creep = null;
  let container = source.nearContainers()[0];

  // No container => nothing to spawn
  if (!container) { return creep; }

  let options = {
    sourceId: source.id,
    containerId: container.id
  };

  // if the source has no miner
  creep = this.spawnFor('miner', options, limits.miner);
  if (creep) { return creep; }

  // if the source has no lorry
  creep = this.spawnFor('lorry', options, limits.lorry);
  if (creep) { return creep; }

  return creep;
};

// Spawn a role if limit is not reached (options act as filters)
StructureSpawn.prototype.spawnFor = function(role, options = {}, limit = 1) {
  let creeps = this.creeps.filter(c => c.memory.role === role)

  // We apply all options to the filter
  if (!_.isEmpty(options)) {
    let keys = Object.keys(options);

    creeps = creeps
      .filter(c => keys.map(k => c.memory[k] === options[k]).every(v => v))
  }

  if (creeps.length < limit) {
    return this.createCustomCreep(role, options);
  }
};

// Blueprints
// TODO: Move into own file
// TODO: make it dependent on the energy
//       regenerate every X ticks or use the regeneration of the global
// TODO: move into config file
const creepBlueprints = Object.create(null);

// Claimer
creepBlueprints.claimer = {
  1: [],
  2: [],
  // 700
  3: [CLAIM,MOVE,MOVE],
  // 1300
  4: [CLAIM,CLAIM,MOVE,MOVE],
  // 1300
  5: [CLAIM,CLAIM,MOVE,MOVE]
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
    ATTACK, ATTACK, ATTACK, ATTACK,
    MOVE,   MOVE,   MOVE,   MOVE,
    MOVE,   MOVE
  ],
  // 810
  5: [
    TOUGH,  TOUGH,  TOUGH,
    ATTACK, ATTACK, ATTACK, ATTACK,
    MOVE,   MOVE,   MOVE,   MOVE,
    MOVE,   MOVE
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
  ],
  // 750
  5: [
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
  // TODO: In level 2 we need 4 body [WORK, WORK, WORK, MOVE] parts for miner...
  // 450
  2: [WORK, WORK, WORK, WORK, MOVE],
  // 650
  3: [WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE],
  // 650
  4: [WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE],
  // 650
  5: [WORK, WORK, WORK, WORK, WORK, MOVE, MOVE, MOVE]
};

// Default strategy
const maxEnergyForBalancedCreepMap = new Map([
  [1, 300],
  [2, 400],
  [3, 800],
  [4, 1000],
  [5, 1200],
  [6, 1200]
]);

// Body builder
StructureSpawn.prototype.bodyFor = function(role, options) {
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
    // TODO: remote explorer (options.flagName) need to have ATTACK
    // if (role === 'explorer') {
    //
    // }
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

  const creepName = this.creepName(role);
  // TODO: Only set working property if needed
  // not for claimer, defender and miner
  const memory = _.assign({
    role,
    working: false,
    spawnId: this.id
  }, options);
  const body = this.bodyFor(role, memory);


  let msg = `${this.name} - `;
  let creep = null;
  let canCreate = this.canCreateCreep(body, creepName);

  // Spawn
  if (canCreate === OK) {
    msg += 'Spawning new ' + role + ': ' + creepName;
    creep = this.createCreep(body, creepName, memory);

    Logger.log(msg); // , body, JSON.stringify(memory)
  }

  // Error message
  if (spawnErrors.has(creep)) {
    let error = spawnErrors.get(canCreate);
    msg += `Can not spawn new ${role}: ${creepName} (Error: ${error})`;

    Logger.log(msg, JSON.stringify(memory));

    // Set to null so we don't have to check for string
    creep = null;
  }

  return creep;
};

StructureSpawn.prototype.creepName = function(role) {
  return `${role}-${generateId()}`;
}
