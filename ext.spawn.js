const Logger = require('class.logger');
const {
  everyTicks,
  everyTicksFor,
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

  // Distributor
  newCreep = this.maintainLocalDistributors();
  if (newCreep) { return newCreep; }

  // Military complex (attackFlags)
  newCreep = this.militaryComplexAttack(attackFlags);
  if (newCreep) { return newCreep; }

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
  everyTicksFor(100, this, function(spawn) {
    newCreep = spawn.maintainLocalUpgrader();
    if (newCreep) { return newCreep; }
  });

  // MineralMiner
  newCreep = this.maintainLocalMineralizer();
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
  if (!counts['logistics'] && !counts['lorry'] && !counts['distributor']) {
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
        let setting = flag.memory;

        if(flag.memory.active && flag.memory.tactic == 'defensiveArcher') {
          limit = flag.memory.requiredUnits.heavyBowman;
          if(flag.memory.activeUnits.heavyBowman.length < limit) {
            creep = this.spawnForMilitary('heavyBowman', options, limit);

            if(creep) {
              flag.memory.activeUnits.heavyBowman.push(creep);
            }
          }

          return creep;
        }

        if(flag.memory.active && flag.memory.tactic == 'offensiveArcher') {
          limit = flag.memory.requiredUnits.lightBowman;
          if(flag.memory.activeUnits.lightBowman.length < limit) {
            creep = this.spawnForMilitary('lightBowman', options, limit);

            if(creep) {
              flag.memory.activeUnits.lightBowman.push(creep);
            }
          }

          return creep;
        }

        if(flag.memory.active && flag.memory.tactic == 'raid') {
          limit = flag.memory.requiredUnits.mangudai;
          if(flag.memory.activeUnits.mangudai.length < limit) {
            creep = this.spawnForMilitary('mangudai', options, limit);

            if(creep) {
              flag.memory.activeUnits.mangudai.push(creep);
            }
          }

          return creep;
        }

        if(flag.memory.active && flag.memory.tactic == 'destroy') {
          limit = flag.memory.requiredUnits.destroyer;
          if(flag.memory.activeUnits.destroyer.length < limit) {
            creep = this.spawnForMilitary('destroyer', options, limit, setting);

            if(creep) {
              flag.memory.activeUnits.destroyer.push(creep);
            }
          }

          return creep;
        }

        if(flag.memory.active && flag.memory.tactic == 'sabotageWithDeathblow') {
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
  let limit = 0;

  if(this.room.hasConstructionSites() && this.room.hasContainers()) {
    let constructionSites = this.room.constructionSites();

    let buildVolume = 0;
    constructionSites.forEach(function(site) {
      buildVolume += site.progressTotal;
    });

    limit = Math.ceil(buildVolume/5000);

    if(limit > 3) { limit = 3;}
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
  let limit = 0;

  // if the room has no towers we need an explorer to repair
  if(this.room.towers().length < 0) { limit = 1; }

  if(this.room.isStronghold()) {
    // get all controlled explorers
    let allExplorer = _.toArray(Game.creeps).filter(c => {
        return c.memory.controllerId === this.room.controller.id &&
            c.memory.role === 'explorer'
    }).length;
    // get the explorers in room
    let roomExplorer = this.room.find(FIND_MY_CREEPS, {
      filter: (c) => {
          return !c.memory.hasOwnProperty('flagName')
          && c.memory.controllerId === this.room.controller.id
          && c.memory.role === 'explorer'
      }
    }).length;

    let remoteExplorer = _.toArray(Game.creeps).filter(c => {
      return c.memory.hasOwnProperty('flagName')
        && c.memory.controllerId === this.room.controller.id
        && c.memory.role === 'explorer'
    }).length;

    //limit = allExplorer - roomExplorer;
    limit = remoteExplorer;

    // the stronghold has to build up
    if(!this.room.strongholdCheck('walls')) {
      let storageEnergy = this.room.storage.store[RESOURCE_ENERGY];
      let energyReserve = this.room.memory.economy.reserve;

      if(storageEnergy > energyReserve) {
        if(storageEnergy > energyReserve * 1.5) {
          limit = this.room.controller.level == 8 ? limit + 1 : limit;
        }

        limit += this.room.memory.defense.explorerCount;
      }
    }

    // the room is in defense
    if(this.room.memory.defcon >= 2) {
      limit += 2;
    }
  }

  return this.spawnFor('explorer', {}, limit);
};

// Upgrader
StructureSpawn.prototype.maintainLocalUpgrader = function() {
  let limit = 0;

  const level = this.room.controller.level;
  const storage = this.room.controller.nearStorage(4);
  const containers = this.room.controller.nearContainers(4);

  // If we have a storage near the controller
  if(!_.isEmpty(storage)) {
    let storageEnergy = storage.store[RESOURCE_ENERGY];
    let energyReserve = this.room.memory.economy.reserve;

    if(storageEnergy < energyReserve) {
      return;
    }

    // we build at least one upgrader
    limit = 1;

    // additional upgraders
    if(level < 8 && storageEnergy > energyReserve) {
      // everything above the reserve will spawn additional upgraders
      let energyCapacityAvailable = this.room.energyCapacityAvailable;
      let upgraderPerformance = (Math.floor((energyCapacityAvailable - (level*2*50))/100))*1500;

      limit += Math.floor((storageEnergy - energyReserve) / upgraderPerformance);

      // but only up to the given count
      let maxUpgraderCount = this.room.memory.economy.maxUpgraderCount;

      limit = limit <= maxUpgraderCount ? limit : maxUpgraderCount;
    }
  }
  else if(!_.isEmpty(containers)) {
    // TODO: If there are more than one container
    let containerEnergy = containers[0].store[RESOURCE_ENERGY];

    // TODO: revision
    if(containerEnergy > 1333) {
      let upgrader = this.room.find(FIND_MY_CREEPS, {
        filter: (c) => c.isControlledBy(this.room.controller.id) && c.isRole('upgrader')
      });
      // 1333 results from the 'carry + carry * 1/3' condition of logistics (at 500 carryCap)
      limit = 1 + upgrader.length;
    }
  }

  return this.spawnFor('upgrader', {}, limit);
};

// Distributor
StructureSpawn.prototype.maintainLocalDistributors = function() {
  // no storage or level 6 --> no distributor
  if(_.isEmpty(this.room.storage) || this.room.controller.level < 6) { return; }
  let limit = 1;

  let options = {
    containerId : this.room.storage.id
  };

  return this.spawnFor('distributor', options, limit);
};

// Mineralizer
StructureSpawn.prototype.maintainLocalMineralizer = function() {
  if (
    !this.room.hasExtractor() ||
    this.room.mineral().mineralAmount === 0 ||
    !this.room.mineral() ||
    !this.room.mineral().nearContainers()[0]
  ) { return; }

  let limit = 1;

  let options = {
    mineralId : this.room.mineral().id,
    containerId : this.room.mineral().nearContainers()[0].id
  };

  return this.spawnFor('mineralizer', options, limit);
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
          flag.room.controller.reservation.username === ME &&
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

        // If DEFCON is high, reduce lorrys because of spawn time
        // TODO: 2 spawns, then all ok
        if(this.room.memory.defcon >= 2) {
          limit.lorry = 1;
        }

        let containers = flag.room.containers();

        // If there is no container --> nothing to spawn
        if(!containers) {
          limits.miner = 0;
          limits.lorry = 0;
        }

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

StructureSpawn.prototype.spawnForMilitary = function(role, options = {}, limit = 1, setting = {}) {
  let creeps = this.room.controller.creeps.filter(c => c.memory.role === role)

  // We apply all options to the filter
  if (!_.isEmpty(options)) {
    let keys = Object.keys(options);

    creeps = creeps
      .filter(c => keys.map(k => c.memory[k] === options[k]).every(v => v))
  }

  if (creeps.length < limit) {
    return this.createCustomCreep(role, options, setting);
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
StructureSpawn.prototype.bodyFor = function(role, options, setting) {
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
    let spawnLevel = this.room.spawnLevel(level);
    let secundary = spawnLevel;

    let primary = Math.floor((energyCapacityAvailable - (spawnLevel * 2 * 50)) / 100);
    // at level 8 we need only 15 WORK parts
    primary = spawnLevel === 8 ? 15 : primary;

    if(primary + secundary * 2 > 50) { primary = 50 - secundary * 2; }

    body = [];
    for (let i = 0; i < primary; i++) {
      body.push(WORK);
    }

    for (let i = 0; i < secundary; i++) {
      body.push(CARRY);
      body.push(MOVE)
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
    // TODO: move in creeps helper
    let sourceRoom = Game.getObjectById(options.sourceId).room;
    let isRemoteLorry = !_.isEqual(this.room, sourceRoom);

    // Max energy
    let energy = 750;
    if(level == 6 && isRemoteLorry) { energy = 1050; }
    if(level >= 7 && isRemoteLorry) { energy = 2500; }

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

  // Distributor
  } else if (role === 'distributor') {
    // Max energy
    let energy = 750;
    if(_.inRange(level, 6, 7)) {
      if(this.room.hasExtractor() && this.room.mineral().mineralAmount > 0) {
        energy = 2100;
      } else {
        energy = 1050;
      }
    } else if(level === 8) {
      energy = 2500;
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

  // Mineralizer
  } else if (role === 'mineralizer') {
    let energy = energyCapacityAvailable;
    if(energy > 4500) { energy = 4500; }

    parts = Math.floor(energy / 450);

    body = [];
    for (let i = 0; i < parts; i++) {
      body.push(WORK);
      body.push(WORK);
      body.push(WORK);
      body.push(WORK);
      body.push(MOVE);
    }

  // Monk
  } else if (role === 'monk') {
    // Max energy
    let energy = 1290;
    if (energy > energyCapacityAvailable) {
      energy = energyCapacityAvailable;
    }

    // A monk to absorb energy from towers
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

  // Melee
  } else if (role === 'melee') {
    // A light armored melee
    let armor = 5; // 2 // one cost: 70
    let attack = 10; // 5 // one cost: 130

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

  // Destroyer
  } else if (role === 'destroyer') {
    let energy;
    if(setting.requiredStrength.destroyer === 'low') { energy = 800; }
    if(setting.requiredStrength.destroyer === 'moderate') { energy = 2300; }
    if(setting.requiredStrength.destroyer === 'high') { energy = 3650; }
    if(setting.requiredStrength.destroyer === 'ultra') { energy = 3650; }

    parts = Math.floor((energy - 50) / 750 * 5);
    // with 1:1 Work/Move and 1 single Carry
    body = [];
    for (let i = 0; i < parts; i++) {
      if(i == 0) { body.push(CARRY); }
      body.push(MOVE);
      body.push(WORK);
    }

  // Mangudai
  } else if (role === 'mangudai') {
    // A fast mangudai with medikit
    let attack = 4; // 7
    let heal = 1; // 1
    let extraMove = (heal*3) + (attack*3); // 4
    // cost: 2100 // 2300

    body = [];
    for (let i = 0; i < extraMove; i++) {
      // cost: 50
      body.push(MOVE);
    }

    for (let i = 0; i < attack; i++) {
      // cost: 250
      body.push(MOVE);
      body.push(MOVE);
      body.push(RANGED_ATTACK);
    }

    for (let i = 0; i < heal; i++) {
      // cost: 350
      body.push(MOVE);
      body.push(MOVE);
      body.push(HEAL);
    }

  // heavy Bowman
  } else if (role === 'heavyBowman') {
    // Max energy
    let energy = energyCapacityAvailable;

    parts = Math.floor(energy / 500);

    body = [];
    for (let i = 0; i < parts; i++) {
      // cost: 50
      body.push(MOVE);
    }

    for (let i = 0; i < parts; i++) {
      // cost: 150
      body.push(RANGED_ATTACK);
    }

  // ligth Bowman
  } else if (role === 'lightBowman') {
    // Max energy
    let energy = energyCapacityAvailable;

    parts = Math.floor(energy / 470);

    body = [];
    for (let i = 0; i < parts; i++) {
      // cost: 20
      body.push(TOUGH);
    }

    for (let i = 0; i < parts; i++) {
      // cost: 150
      body.push(MOVE);
      body.push(MOVE);
      body.push(MOVE);
    }

    for (let i = 0; i < parts; i++) {
      // cost: 300
      body.push(RANGED_ATTACK);
      body.push(RANGED_ATTACK);
    }

  // Create a balanced body
  } else {
    let energyForBalancedCreep = maxEnergyForBalancedCreepMap.get(level);

    // Exerption: Explorer
    if(role === 'explorer') {
      let hasClaimFlag = _.isEmpty(options.flagName) ? false : true;

      // Local Explorer (Wall Builder)
      if(!hasClaimFlag) {
        if(level === 8) {
          energyForBalancedCreep = 3200;
        }
        else if(_.inRange(level, 6, 7)) {
          energyForBalancedCreep = 2300;
        }
      // Remote Explorer
      } else {
        let claim = Game.flags[options.flagName].room;
        // TODO: BUG: if we claim a new room we have to build cts fast. otherwise the first explorers are so weak like these
        // if there is nothing to build in the room we spawn a very small explorer
        if(!claim.hasConstructionSites()) {
          if(level >= 5) {
            energyForBalancedCreep = 600;
          }
        }
        // if the claim becomes a new colony and become explorer support from home we spawn a big explorer
        if(claim.isColony()) {
          energyForBalancedCreep = 2300;
        }
      }
    }

    // If we want to spwan a logistics for 50 ticks but can not because we don't have energy we reduce the energyCapacityAvailable
    if (role === 'logistics') {
      this.rememberTo(
        () => energyForBalancedCreep = energyAvailable,
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

StructureSpawn.prototype.createCustomCreep = function(role, options = {}, setting = {}) {
  if (this.spawning) { return; }

  const creepName = this.creepName(role);
  // TODO: Only set working property if needed
  // not for claimer, defender and miner
  const memory = _.assign({
    role,
    working: false,
    controllerId: this.room.controller.id
  }, options);
  const body = this.bodyFor(role, memory, setting);


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
