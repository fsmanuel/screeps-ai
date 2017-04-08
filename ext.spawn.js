const Logger = require('class.logger');
const {
  everyTicks,
  generateId,
  rememberTo,
  rememberToFor
} = require('util.helpers');

StructureSpawn.prototype.rememberTo = rememberTo;
StructureSpawn.prototype.rememberToFor = rememberToFor;

// The autoSpawn
// TODO: think about what role needs to be checked every X ticks!
StructureSpawn.prototype.autoSpawnCreeps = function(claimFlags, defendFlags, attackFlags) {
  if (this.spawning) { return; }

  let newCreep;
  const level = this.room.controller.level;

  /*
    Local (same room)
  */

  // Survive
  newCreep = this.maintainSurvival();
  if (newCreep) { return newCreep; }

  // Military complex (defendFlags)
  newCreep = this.militaryComplexDefend(defendFlags);
  if (newCreep) { return newCreep; }

  // Military complex (attackFlags)
  if (level >= 4) {
    newCreep = this.militaryComplexAttack(attackFlags);
    if (newCreep) { return newCreep; }
  }

  // Mining
  newCreep = this.maintainLocalMining();
  if (newCreep) { return newCreep; }

  // Explorer
  newCreep = this.maintainLocalExplorer();
  if (newCreep) { return newCreep; }

  // Logistics
  newCreep = this.maintainLocalLogistics();
  if (newCreep) { return newCreep; }

  // Builder
  newCreep = this.maintainLocalBuilder();
  if (newCreep) { return newCreep; }

  // Upgrader
  newCreep = this.maintainLocalUpgrader();
  if (newCreep) { return newCreep; }

  /*
    Remote (claimed rooms)
  */

  // Only spawns with a controller level 3 can maintain colonies
  if (level < 3) { return; }

  // Filter claimFlags managed by controller
  const ownedClaimFlags = claimFlags
    .filter(f => f.memory.controllerId === this.room.controller.id);

  // Claimer
  newCreep = this.claimColonies(ownedClaimFlags);
  if (newCreep) { return newCreep; }

  // Remote explorer
  newCreep = this.maintainRemoteExplorer(ownedClaimFlags);
  if (newCreep) { return newCreep; }

  // Remote mining
  newCreep = this.maintainRemoteMining(ownedClaimFlags);
  if (newCreep) { return newCreep; }

  // Remote support
  newCreep = this.maintainRemoteSupport(ownedClaimFlags);
  if (newCreep) { return newCreep; }

};


/*
 Local
*/

// If no logistics are left AND no lorries create a backup creep
// TODO: Maybe we should check for lorry if its source is in the room?
StructureSpawn.prototype.maintainSurvival = function() {
  const counts = this.room.controller.creepsCounts;


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
StructureSpawn.prototype.militaryComplexDefend = function(defendFlags) {
  return everyTicks(2, () => {
    if (_.isEmpty(defendFlags)) { return; }

    return defendFlags
      .reduce((creep, flag) => {
        if (creep) { return creep; }

        // TODO: make it dependend on the enemeies
        let limit = 2;
        let options = { flagName: flag.name };

        let defenders = _.toArray(Game.creeps).filter( (c) => {
            return c.isRole('defender') && c.memory.flagName === flag.name
        });

        // If we already have enough defenders mapped on the flag
        if (defenders.length >= limit) {
          limit = 0;
        }

        return this.spawnFor('defender', options, limit);
      }, undefined);

    console.log('Ui! We have to defend our selfs');
  });
};

StructureSpawn.prototype.militaryComplexAttack = function(attackFlags) {
  return everyTicks(2, () => {
    if (_.isEmpty(attackFlags)) { return; }

    return attackFlags
      .reduce((creep, flag) => {
        if (creep || !flag.memory.active) { return creep; }

        let options = { flagName: flag.name };
        let limit = 0;

        if (flag.memory.tactic == 'destroy') {
          limit = flag.memory.limit;
          return this.spawnForMilitary('destroyer', options, limit);
        }

        if (flag.memory.tactic === 'sabotageWithDeathblow') {
          limit = flag.memory.monkLimit;
          if (flag.memory.unitTypes.monk.length < limit) {
            creep = this.spawnForMilitary('monk', options, limit);

            if (creep) {
              flag.memory.unitTypes.monk.push(creep);
              return creep;
            }
          }

          limit = flag.memory.meleeLimit;
          if (flag.memory.unitTypes.melee.length < limit) {
            creep = this.spawnForMilitary('melee', options, limit);

            if (creep) {
              flag.memory.unitTypes.melee.push(creep);
              return creep;
            }
          }

          return creep;
        }
      }, undefined);
    console.log('Support our offensive');
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

  let constructionSites = this.room.find(FIND_MY_CONSTRUCTION_SITES);

  /*
  TODO: spawn less when sites are roads, walls, ramps
  if (constructionSites) {
    let sites= constructionSites.length;
    let roads= constructionSites.filter(c => c.structureType === 'road').length;
    let walls= constructionSites.filter(c => c.structureType === 'wall').length;

    sites - (roads + walls) + Math.round(roads/5) + Math.round(walls/5))
  }
  */

  // Only spawn if we have construction sites or containers
  if (!this.room.hasConstructionSites() || !this.room.hasContainers()) {
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

  // TODO: better reuse of census data
  // In Strongholds we need explorer to build walls and ramparts
  if (this.room.isStronghold()) {
    let allExplorer = _.toArray(Game.creeps).filter(c => {
        return c.memory.controllerId === this.room.controller.id &&
            c.memory.role === 'explorer'
    });

    let roomExplorer = this.room.find(FIND_MY_CREEPS, {
      filter: (c) => {
          return !c.memory.hasOwnProperty('flagName')
          && c.memory.controllerId === this.room.controller.id
          && c.memory.role === 'explorer'
      }
    });

    if (roomExplorer.length < 1) {
        if (allExplorer) { limit = allExplorer.length + 1; }
    }
  }
  // If we have a tower we don't need an explorer in non stronghold rooms
  else if (towers.length > 0 && !this.room.hasWalls()) {
    limit = 0;
  }

  return this.spawnFor('explorer', {}, limit);
};

// Upgrader

// TODO revisit the limit
// WIP: this is already under construction, but this code upgrades really fast yet
StructureSpawn.prototype.maintainLocalUpgrader = function() {
  const level = this.room.controller.level;

  // No more need to upgrade
  if (level === 8) { return; }

  let limit = level;

  let upgrader = this.room.find(FIND_MY_CREEPS, {
    filter: (c) => {
        return c.memory.controllerId === this.room.controller.id
        && c.memory.role === 'upgrader'
    }
  });
  let upgraderCount = upgrader.length;

  let storage = this.room.controller.nearStorage(4);
  let containers = this.room.controller.nearContainers(4);
  let additional = 0;

  // If we have a storage near the controller
  if (storage) {
      let storageEnergy = storage.store[RESOURCE_ENERGY];
      // and he gets full --> increase
      if (storageEnergy >= 10000) {
          additional += 1;
      }
      // and fuller --> increase
      if (storageEnergy >= 20000) {
          additional += 1;
      }
      // and WOW! --> increase
      if (storageEnergy >= 40000) {
          additional += 1;
      }
  }
  else if (!_.isEmpty(containers)) {
      // TODO: If there are more than one container
      everyTicks(100, function() {
        let containerEnergy = containers[0].store[RESOURCE_ENERGY];

        if (containerEnergy > 1333) {
          // 1333 results from the 'carry + carry * 1/3' condition of logistics (at 500 carryCap)
          additional = upgraderCount;
        }
      });
  }

  //WIP: This can be refactored after finished adjusting
  if (_.isEmpty(containers)) {
      limit = 0;
  } else {
    if (level == 2) {
        limit = 1;
        if (this.room.hasExtensions(5)) {
            limit += additional;
        }
    }
    if (level == 3) {
        limit = 1;
        if (this.room.hasExtensions(10)) {
            limit += additional;
        }
    }
    if (level > 3) {
        limit = 1;
        if (this.room.hasExtensions(20)) {
            limit += additional;
        }
    }
  }
  if (level > 4) {
    limit = 4;
  }
  if (level > 5) {
    limit = 3;
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

        // If the flag is owned by another controller we don't care
        if (
          flag.memory.controllerId &&
          flag.memory.controllerId !== this.room.controller.id
        ) {
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

        // If we have more than 2000 ticks we don't care
        if (
          flag.room &&
          flag.room.controller.reservation &&
          flag.room.controller.reservation.username === 'fsmanuel' &&
          flag.room.controller.reservation.ticksToEnd > 2000
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

        // If we don't have 2 containers and more than 1 source => increase
        if (containers.length < 2 && flag.room.find(FIND_SOURCES).length > 1) {
          limit += 1;
        }

        // If flag secondary is GREEN => increase
        if (flag.secondaryColor === COLOR_GREEN) {
          limit += 1;

          // If we have no spawns => increase
          if (!flag.room.hasSpawns()) {
            limit += 1;
          }

          // If we have less then 5 extensions => increase
          if (!flag.room.hasExtensions(5)) {
            limit += 1;
          }

          // If we have less then 10 extensions => increase
          if (!flag.room.hasExtensions(10)) {
            limit += 1;
          }

          if (flag.room.controller.level > 6 && flag.room.hasSpawns()) {
            limit = 0;
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
          lorry: 1
        };
        let containers = flag.room.containers();

        // If flag room has two miner we don't need to support them anymore
        if (flag.room.hasSpawns()) {
          let controller = flag.room.controller;

          if (controller.level >= 3) {
            limits.miner = 0;
          }
        }

        // We support a claimed colony with 3 containers with 1 lorry
        if (
          flag.secondaryColor === COLOR_GREEN &&
          containers.length >= 3 &&
          flag.room.controller.level < 6
        ) {
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

// Support / Boost
StructureSpawn.prototype.maintainRemoteSupport = function(claimFlags) {
  return everyTicks(10, () => {
    return claimFlags
      .reduce((creep, flag) => {
        if (creep) { return creep; }
        if (!flag.room) { return creep; }

        const level = this.room.controller.level;
        let limit = 0;

        if (level === 8) {
          // We support a claimed colony with 3 containers with 1 transport lorry
          if (flag.secondaryColor === COLOR_GREEN) {
            limit = 1;
          }

          let options = {
            containerId: this.room.storage.id,
            targetRoom: flag.room.name
          };

          // console.log(options.controllerId, limit);

          // console.log(this.name, 'support');
          return this.spawnFor('lorry', options, limit);
        }
      }, undefined);
  });
};


/*
 Helpers
*/

// Mining
StructureSpawn.prototype.spawnForMining = function(source, limits = {}) {
  let creep = null;
  let {
    containerId,
    needsLorry,
    sourceId
  } = source.room.miningInformationFor(source);

  // No container => nothing to spawn
  if (!containerId) { return creep; }

  // TODO: add remote information
  let options = {
    sourceId,
    containerId,
    targetRoom: null
  };

  // if the source has no miner
  creep = this.spawnFor('miner', options, limits.miner);
  if (creep) { return creep; }

  // If the source requested a lorry we increase
  if (needsLorry) { limits.lorry += 1; }

  // if the source has no lorry
  creep = this.spawnFor('lorry', options, limits.lorry);

  // It's not 100% safe. It might be the case that we need to spawn a lorry anyway and this one is not the extra one we need...
  if (
    needsLorry &&
    creep &&
    Game.creeps[creep].isRole('lorry') &&
    Game.creeps[creep].memory.sourceId === sourceId
  ) {
    source.room.shippingLorryFor(source);
  }

  if (creep) { return creep; }

  return creep;
};

// Spawn a role if limit is not reached (options act as filters)
StructureSpawn.prototype.spawnFor = function(role, options = {}, limit = 1) {
  let creeps = this.room.controller.creeps.filter(c => c.memory.role === role)

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

StructureSpawn.prototype.spawnForMilitary = function(role, options = {}, limit = 1) {
  let creeps = this.room.controller.creeps.filter(c => c.memory.role === role)

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
  [6, 1200],
  [7, 1200],
  [8, 1200]
]);

// Body builder
StructureSpawn.prototype.bodyFor = function(role, options) {
  const level = this.room.controller.level;
  const energyCapacityAvailable = this.room.energyCapacityAvailable;
  const energyAvailable = this.room.energyAvailable;
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

  // Upgrader
  } else if (role === 'upgrader') {
    // TODO: make it more depend on energy available
    // but to do this we have to combine body creation and creep spawning count
    /* WIP
        //1) if there are more than one -> iterate and sum.
        //2) are they flaged green
    //let container = this.room.controller.nearContainers(4)[0];
    //let storage = this.room.controller.nearStorage(6);
    */

    //TODO: refactor

    var addWork = 0;
    var addCarry = 0;
    var addMove = 0;
    var base = 1;

    if (level == 2) {
      // 250+300=550 / 550
      addWork = 2;
      addCarry = 1;
      addMove = 0;
    }

    else if (level == 3) {
      // 450+300=750
      addWork = 3;
      addCarry = 2;
      addMove = 1;
    }

    else if (level == 4) {
      // 1000+300=1300 / 1300
      addWork = 7;
      addCarry = 4;
      addMove = 2;
    }

    else if (level => 5) {
      // 1500+300=1800 / 1800
      addWork = 10;
      addCarry = 6;
      addMove = 4;
    }

    body = [];
    for (let i = 0; i < addWork; i++) {
      body.push(WORK);
    }

    for (let i = 0; i < addCarry; i++) {
      body.push(CARRY);
    }

    for (let i = 0; i < addMove; i++) {
      body.push(MOVE);
    }

    // basic part - 300
    for (let i = 0; i < base; i++) {
      body.push(WORK);
      body.push(WORK);
      body.push(CARRY);
      body.push(MOVE);
    }

  // Claimer
  // TODO: I think we don't need the extra MOVE part
  } else if (role === 'claimer') {
    if (energyCapacityAvailable < 1300) {
      body = [CLAIM, MOVE]; // 650

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
    // COMMIT: better positioning of attack parts (fight until the end)
    // TODO: code it pirx!

    // Even on swamp we have a walk time of 3
    for (let i = 0; i < parts * 2; i++) {
      body.push(MOVE);
    }

    for (let i = 0; i < parts; i++) {
      body.push(ATTACK);
    }

  // Lorries
  // TODO: We could make long distance lorries bigger and reduce the number to 1?
  } else if (role === 'lorry') {
    // Max energy
    let energy = 1050;

    //  && options.targetRoom
    if (level === 8) {
      energy = 2100;
    }
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

  // pawn
  } else if (role === 'monk') {
    // Max energy
    let energy = 1290;
    if (energy > energyCapacityAvailable) {
      energy = energyCapacityAvailable;
    }

    // A pawn to absorb energy from towers
    //parts = Math.floor(energy / 70);

    body = [];
    for (let i = 0; i < 2; i++) {
      body.push(TOUGH);
    }

    // Even on swamp we have a walk time of 3
    for (let i = 0; i < 6; i++) {
      body.push(MOVE);
    }

    for (let i = 0; i < 4; i++) {
      body.push(HEAL);
    }

    body.push(RANGED_ATTACK);

     /*
    // Max energy
    let energy = 1300;
    if (energy > energyCapacityAvailable) {
      energy = energyCapacityAvailable;
    }

    // A pawn to absorb energy from towers
    //parts = Math.floor(energy / 70);
    parts = 14;

    body = [];
    for (let i = 0; i < parts; i++) {
      body.push(TOUGH);
    }

    // Even on swamp we have a walk time of 3
    for (let i = 0; i < parts; i++) {
      body.push(MOVE);
    }

    for (let i = 0; i < 1; i++) {
      body.push(HEAL);
      body.push(MOVE);
    }
    */
  // melee
  } else if (role === 'melee') {
    // Max energy
    let energy = 1140;
    if (energy > energyCapacityAvailable) {
      energy = energyCapacityAvailable;
    }

    // A light armored melee
    //parts = Math.floor(energy / 70);
    let armor = 2; // 2
    let attack = 5; // 5

    body = [];
    for (let i = 0; i < armor; i++) {
      body.push(TOUGH);
      body.push(MOVE);
    }

    // Even on swamp we have a walk time of 3
    for (let i = 0; i < attack; i++) {
      body.push(MOVE);
      body.push(ATTACK);
    }

  // destroyer
  } else if (role === 'destroyer') {
    // Max energy
    let energy = 1200;
    if (energy > energyCapacityAvailable) {
      energy = energyCapacityAvailable;
    }

    // A destroyer
    //parts = Math.floor(energy / 150);
    parts = 8;

    body = [];
    for (let i = 0; i < parts; i++) {
      body.push(WORK);StructureSpawn.prototype.maintainLocalExplorer = function() {
  let limit = 1;
  let towers = this.room.towers();

  // TODO: better reuse of census data
  // In Strongholds we need explorer to build walls and ramparts
  if (this.room.isStronghold()) {
    let allExplorer = _.toArray(Game.creeps).filter(c => {
        return c.memory.controllerId === this.room.controller.id &&
            c.memory.role === 'explorer'
    });

    let roomExplorer = this.room.find(FIND_MY_CREEPS, {
      filter: (c) => {
          return !c.memory.hasOwnProperty('flagName')
          && c.memory.controllerId === this.room.controller.id
          && c.memory.role === 'explorer'
      }
    });

    if (roomExplorer.length < 1) {
        if (allExplorer) { limit = allExplorer.length + 1; }
    }
  }
  // If we have a tower we don't need an explorer in non stronghold rooms
  else if (towers.length > 0 && !this.room.hasWalls()) {
    limit = 0;
  }

  return this.spawnFor('explorer', {}, limit);
};
      body.push(MOVE);
    }

  // Create a balanced body
  } else {
    let energyForBalancedCreep = maxEnergyForBalancedCreepMap.get(level);

    // If we want to spwan a logistics for 200 ticks but can not because we don't have energy we reduce the energyCapacityAvailable
    if (role === 'logistics') {
      this.rememberTo(
        () => energyForBalancedCreep = energyAvailable,
        energyForBalancedCreep > energyAvailable,
        {
          key: 'emergency',
          limit: 200
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
    controllerId: this.room.controller.id
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
