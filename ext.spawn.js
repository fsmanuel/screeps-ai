const Logger = require('class.logger');
const {
  everyTicks,
  generateId,
  rememberTo,
  rememberToFor
} = require('util.helpers');

StructureSpawn.prototype.rememberToFor = rememberToFor;

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


  // TODO: We have a problem if 2 lorries are in another room!! We kill ourselfs!
  if (!counts['logistics'] && !counts['lorry']) {
    // TODO: Use spawnFor?
    return this.createCustomCreep('logistics');
  }

  // If we have a RED flag but no defenders and no tower we help our selfs
  // if (
  //   this.hasFlag(COLOR_RED) &&
  //   counts['defender'] === 0 &&
  //   !this.room.hasTowers()
  // ) {
  //   return this.spawnFor('defender');
  // }
};

// Military complex
// We run it every 2 ticks to spawn other creeps as well
StructureSpawn.prototype.militaryComplex = function(defendFlags) {
  return everyTicks(2, () => {
    if (_.isEmpty(defendFlags)) { return; }

    return defendFlags
      .reduce((creep, flag) => {
        if (creep) { return creep; }

        // TODO: make it dependend on the enemeies
        let limit = 2;
        let options = { flagName: flag.name };

        let defenders = flag.room.find(FIND_MY_CREEPS, {
          filter: c => c.isRole('defender')
        });

        // If we already have enough defenders in the room
        if (defenders.length >= limit) {
          limit = 0;
        }

        return this.spawnFor('defender', options, limit);
      }, undefined);

    console.log('Ui! We have to defend our selfs');
  });
};

// Mining (max 2 sources = 2 loops)
StructureSpawn.prototype.maintainLocalMining = function() {
  let limits = {
    miner: 1,
    lorry: 1
  };

  return this.room
    .find(FIND_SOURCES)
    .reduce((creep, source) => {
      if (creep) { return creep; }

      return this.spawnForMining(source, limits);
    }, undefined);
};

// Builder
// TODO: 1-3 builders depending on construction sites (do we get the progress? volume to be build?)
// TODO: if we have a local explorer we should decrease limit by 1
StructureSpawn.prototype.maintainLocalBuilder = function() {
  let limit = 1;

  let constructionSites = this.room.find(FIND_CONSTRUCTION_SITES);

  // Only spawn if we have construction sites
  if (_.isEmpty(constructionSites)) {
    limit = 0;
  } else {
    // Increase if we have 4 or more construction sites
    if (constructionSites.length > 3) {
      limit += 1;
    }

    // console.log(constructionSites.length, JSON.stringify(constructionSites));
  }

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
  if (level > 4) {
    limit = 4;
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
        if (flag.memory.spawnId && flag.memory.spawnId !== this.id) {
          return creep;
        }

        // If the controller is claimed we don't care
        if (
          flag.room &&
          flag.room.controller.my &&
          !flag.room.controller.reservation
        ) {
          return creep;
        }

        let options = { flagName: flag.name };
        let limit = 2;

        if (this.room.energyCapacityAvailable >= 1300) {
          limit = 1;
        }

        return this.spawnFor('claimer', options, limit);
      }, undefined);
  });
};

// Explorer
StructureSpawn.prototype.maintainRemoteExplorer = function(claimFlags) {
  return everyTicks(10, () => {
    return claimFlags
      .reduce((creep, flag) => {
        if (creep) { return creep; }
        if (!flag.room) { return creep; }

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
        if (!flag.room) { return creep; }

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

  // Show population per spawn
  everyTicks(100, () => {
    Logger.log(this.name, JSON.stringify(this.creepsCounts));
  });
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

  // TODO: To make it more efficient for remote containers we need to call this more often, change the limit. But first we need to know if we are local or remote!
  // if the container is at max capacity for 200 ticks
  this.rememberToFor(
    () => limits.lorry += 1,
    container.isFullOf(RESOURCE_ENERGY),
    {
      key: 'containerNeedsLorryCount',
      id: container.id,
      limit: 200
    }
  );

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
// Usefull for developing new roles
const creepBlueprints = Object.create(null);

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
  const energyCapacityAvailable = this.room.energyCapacityAvailable;
  const blueprintsForRole = creepBlueprints[role];

  let body;
  let parts;

  // Use blueprint if available
  if (blueprintsForRole) {
    body = creepBlueprints[role][level];

    // Fallback to previous level
    if (!body) {
      body = creepBlueprints[role][level - 1];
    }

  // Claimer
  // TODO: I think we don't need the extra MOVE part
  } else if (role === 'claimer') {
    if (energyCapacityAvailable < 1300) {
      body = [CLAIM, MOVE, MOVE]; // 700

    // If we can build the bigger creap we do
    } else {
      body = [CLAIM, CLAIM, MOVE, MOVE]; // 1300
    }

  // Defender
  } else if (role === 'defender') {
    // Max energy
    let energy = 1160;
    if (energy > energyCapacityAvailable) {
      energy = energyCapacityAvailable;
    }

    // A TOUGH ATTACK(er) which is fast (twice MOVE than other parts)
    parts = Math.floor(energy / 290);

    body = [];
    for (let i = 0; i < parts; i++) {
      body.push(TOUGH);
    }

    for (let i = 0; i < parts; i++) {
      body.push(ATTACK);
    }

    // Even on swamp we have a walk time of 3
    for (let i = 0; i < parts * 2; i++) {
      body.push(MOVE);
    }

  // Lorries
  // TODO: We could make long distance lorries bigger and reduce the number to 1?
  } else if (role === 'lorry') {
    // Max energy
    let energy = 750;
    if (energy > energyCapacityAvailable) {
      energy = energyCapacityAvailable;
    }

    // Create a body with twice as many CARRY as MOVE parts
    parts = Math.floor(energy / 150);

    body = [];
    for (let i = 0; i < parts * 2; i++) {
      body.push(CARRY);
      if (i < parts) { body.push(MOVE); }
    }

  // Miner
  } else if (role === 'miner') {
    // 350
    let workParts = [WORK, WORK, WORK];
    let moveParts = [MOVE];

    if (energyCapacityAvailable >= 450) { workParts.push(WORK); }
    if (energyCapacityAvailable >= 550) { workParts.push(WORK); }

    // Perfect mining reached - we make it faster
    if (energyCapacityAvailable >= 600) { moveParts.push(MOVE); }
    if (energyCapacityAvailable >= 650) { moveParts.push(MOVE); }

    // TODO: Make it distributed [WORK, MOVE, WORK, ...]
    body = workParts.concat(moveParts);

  // TODO: remote explorer (options.flagName) need to have ATTACK
  // } else if (role === 'explorer') {

  // Create a balanced body
  } else {
    let energyForBalancedCreep = maxEnergyForBalancedCreepMap.get(level);

    // If we want to spwan a logistics for 50 ticks but can not because we don't have energy we reduce the energyCapacityAvailable
    if (role === 'logistics') {
      rememberTo(
        () => energyForBalancedCreep = energyCapacityAvailable,
        energyForBalancedCreep > energyCapacityAvailable,
        {
          key: 'emergency',
          limit: 50
        }
      );
    }

    if (energyForBalancedCreep > energyCapacityAvailable) {
      energyForBalancedCreep = energyCapacityAvailable;
    }

    // create a balanced body with max 50 parts
    parts = Math.floor(energyForBalancedCreep / 200);
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
