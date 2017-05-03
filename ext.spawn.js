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

  // Military complex (attackFlags)
  // newCreep = this.militaryComplexAttack(attackFlags);
  // if (newCreep) { return newCreep; }

  // Explorer
  newCreep = this.maintainLocalExplorer();
  if (newCreep) { return newCreep; }

  // Logistics
  newCreep = this.maintainLocalLogistics();
  if (newCreep) { return newCreep; }

  // Builder
  newCreep = this.maintainLocalBuilder();
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
};

/*
 Local
*/

// If no logistics are left AND no lorries create a backup creep
// TODO: Maybe we should check for lorry if its source is in the room?
StructureSpawn.prototype.maintainSurvival = function() {
  const counts = this.room.controller.creepsCounts;


  // TODO: We have a problem if 2 lorries are in another room!! We kill ourselfs!
  // TODO: We no longer have distributors?!
  if (!counts['logistics'] && !counts['lorry'] && !counts['distributor']) {
    // TODO: Use spawnFor?
    return this.createCustomCreep('logistics');
  }
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
      }, undefined);
    console.log('Support our offensive');
  });
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
      let energyReserve = this.room.memory.economy.storageEnergyReserve;

      if(storageEnergy > energyReserve) {
        if(storageEnergy > energyReserve * 1.5) {
          limit = this.room.controller.level == 8 ? limit + 1 : limit;
        }

        limit += this.room.memory.defense.explorerCount;
      }
    }
  }

  return this.spawnFor('explorer', {}, limit);
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
          flag.room.controller.reservation.username.toLowerCase() === ME &&
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
          // limit += 1;

          // If we have no spawns => increase
          if (!flag.room.hasSpawns()) {
            limit += 1;
          }

          // // If we have less then 5 extensions => increase
          // if (!flag.room.hasExtensions(5)) {
          //   limit += 1;
          // }
          //
          // // If we have less then 10 extensions => increase
          // if (!flag.room.hasExtensions(10)) {
          //   limit += 1;
          // }
        }

        if (flag.room.name === 'W81N3') {
          limit = 1;
        }

        return this.spawnFor('explorer', options, limit);
      }, undefined);
  });
};

/*
 Helpers
*/

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
    let utility = spawnLevel * 2;

    let work = Math.floor(
      (energyCapacityAvailable - (utility * 50)) / 100
    );

    if (work + utility > 50) {
      work = 50 - utility;
    }

    // at level 8 we need only 15 WORK parts
    if (level === 8) {
      work = 15;
    }

    body = [];
    for (let i = 0; i < work; i++) {
      body.push(WORK);
    }

    for (let i = 0; i < spawnLevel; i++) {
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
        energyForBalancedCreep > energyAvailable,
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

StructureSpawn.prototype.createCustomCreep = function(role, options = {}, setting = {}, callback) {
  if (this.spawning) { return; }

  const creepName = this.creepName(role);

  let body;

  if (options.body) {
    body = options.body;
    delete options.body;
  }

  // TODO: Only set working property if needed
  // not for claimer, defender and miner
  const memory = _.assign({
    role,
    working: false,
    controllerId: this.room.controller.id
  }, options);

  // Remove it as soon as we got rid of bodyFor
  if (!body) {
    body = this.bodyFor(role, memory, setting);
  }

  let msg = `${this.name} - `;
  let creep = null;
  let canCreate = this.canCreateCreep(body, creepName);
  // console.log(role, canCreate);

  // Spawn
  if (canCreate === OK) {
    msg += `Spawning new ${role}: ${creepName}`; // - ${body}
    creep = this.createCreep(body, creepName, memory);

    if (callback) {
      callback(creep);
    }

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
