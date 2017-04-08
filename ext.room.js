const Logger = require('class.logger');

const {
  everyTicks,
  everyTicksFor,
  rememberToFor
} = require('util.helpers');


Room.prototype.rememberToFor = rememberToFor;

Room.prototype.constructionSites = function() {
  return this.find(FIND_MY_CONSTRUCTION_SITES);
};

Room.prototype.hasConstructionSites = function(type = null) {
  let constructionSites = this.constructionSites();
  if(_.isEmpty(constructionSites)) { return false; }

  if(_.isEmpty(type)) {
    return !_.isEmpty(constructionSites);
  } else {
    let fromType = constructionSites.filter((c) => c.structureType == type);
    return !_.isEmpty(fromType);
  }
};

Room.prototype.containers = function() {
  return this.find(FIND_STRUCTURES, {
    filter: s => s.structureType === STRUCTURE_CONTAINER
  });
};

Room.prototype.hasContainers = function() {
  return !_.isEmpty(this.containers());
};

Room.prototype.extensions = function() {
  return this.find(FIND_MY_STRUCTURES, {
    filter: s => s.structureType === STRUCTURE_EXTENSION && s.isActive()
  });
};

Room.prototype.hasExtensions = function(amount) {
  return this.extensions().length >= amount;
};

Room.prototype.extractor = function() {
  return this.find(FIND_MY_STRUCTURES, {
    filter: (s) => s.structureType == STRUCTURE_EXTRACTOR
  })[0];
};

Room.prototype.hasExtractor = function() {
  return !_.isEmpty(this.extractor());
};

Room.prototype.mineral = function() {
  return this.find(FIND_MINERALS)[0];
};

Room.prototype.spawns = function() {
  return this.find(FIND_MY_SPAWNS, {
      filter: s => s.isActive()
  });
};

Room.prototype.hasSpawns = function() {
  return !_.isEmpty(this.spawns());
};

Room.prototype.spawnLevel = function(controllerLevel) {
  // returns the level of the room depending on the real existing energyCapacity for spawning
  let extensions = this.extensions().length;

  let maxExtensionsPerLevel = {
    1 : 0,
    2 : 5,
    3 : 10,
    4 : 20,
    5 : 30,
    6 : 40,
    7 : 50,
    8 : 60
  }

  for(let i=controllerLevel; i>0; i--) {
    if(extensions >= maxExtensionsPerLevel[i]) {
      return i;
    }
  }
};

Room.prototype.towers = function() {
  return this.find(FIND_STRUCTURES, {
    filter: s => s.structureType === STRUCTURE_TOWER
  });
};

Room.prototype.hasTowers = function() {
  return !_.isEmpty(this.towers());
};

Room.prototype.walls = function() {
  return this.find(FIND_STRUCTURES, {
    filter: (s) => {
        return s.structureType === STRUCTURE_WALL ||
        s.structureType === STRUCTURE_RAMPART
    }
  });
};

Room.prototype.hasWalls = function() {
  return !_.isEmpty(this.walls());
};


Room.prototype.isKeeperRoom = function() {
  let keeperLairs = this.find(FIND_STRUCTURES, {
    filter: s => s.structureType === STRUCTURE_KEEPER_LAIR
  });

  return !_.isEmpty(keeperLairs);
};

Room.prototype.isColony = function() {
  if(_.isEmpty(this.controller)) {
    return false;
  } else {
    return this.controller.my
  }
};

Room.prototype.underAttack = function() {
  return !_.isEmpty(this.findEnemies());
};

Room.prototype.isStronghold = function() {
    return this.controller.level > 1 && this.controller.my && this.hasWalls()
};

Room.prototype.strongholdCheck = function(type) {
  if(type === 'walls') {
    return this.memory.defense.maxWallHits >= this.memory.defense.finalWallHits
  }
};


// Save information about the room in memory
Room.prototype.updateStructuralData = function() {
  // Setup
  this.memory.sources = this.memory.sources || [];
  this.memory.soloContainerIds = this.memory.soloContainerIds || [];
  const sources = this
    .find(FIND_SOURCES)
    .map((s) => {
      let sourceId = s.id;
      let containers = s.nearContainers();
      let containerId = _.isEmpty(containers) ? null : _.first(containers).id;

      return {
        sourceId,
        containerId
      };
    });

  this.memory.sources = sources;

  const sourceContainerIds = this.memory.sources.map((s) => s.containerId);

  let mineralContainerId;
  let soloContainerIds;
  if(!_.isEmpty(this.mineral().nearContainers())) {
    mineralContainerId = this.mineral().nearContainers()[0].id;

    soloContainerIds = this.containers()
      .filter((c) => !sourceContainerIds.includes(c.id) && !mineralContainerId.includes(c.id))
      .map((c) => c.id);
  } else {
    soloContainerIds = this.containers()
      .filter((c) => !sourceContainerIds.includes(c.id))
      .map((c) => c.id);
  }

  this.memory.soloContainerIds = soloContainerIds;
};

// Experimental
Room.prototype.visitPosition = function(creep) {
  const x = creep.pos.x;
  const y = creep.pos.y;

  // Setup
  this.memory.streetMap = this.memory.streetMap || {};
  this.memory.streetMap[x] = this.memory.streetMap[x] || {};
  this.memory.streetMap[x][y] = this.memory.streetMap[x][y] || 0;

  this.memory.streetMap[x][y] += 1;
};

Room.prototype.drawStreetMap = function() {
  if (this.name !== 'W83N6') { return; }
  _
  .forEach(this.memory.streetMap, (value, x) => {
    _.forEach(value, (value, y) => {
      this.visual.rect(parseInt(x) - 0.5, parseInt(y) - 0.5, 1, 1, {
        fill: 'red',
        opacity: value / 50
      })
    })
  })
};

Room.prototype.optimizeSourceContainers = function() {
  const requestLorry = function(index) {
    // console.log('requestLorry', index);
    this.memory.sources[index].needsLorry = true;
  };

  if(this.memory.sources) {
    this.memory.sources.forEach((source, index) => {
      let { containerId } = source;
      if (!containerId) { return; }

      let container = Game.getObjectById(containerId);

      // Remember to request a lorry if the container is at max capacity for 300 ticks
      this.rememberToFor(
        () => requestLorry.call(this, index),
        container.isFullOf(RESOURCE_ENERGY),
        {
          id: containerId,
          key: 'sourceNeedsLorryCount',
          limit: 300
        }
      );
    });
  }
};

Room.prototype.miningInformationFor = function(source) {
  return this.memory.sources.find((s) => s.sourceId === source.id);
};

Room.prototype.shippingLorryFor = function(source) {
  console.log('shippingLorryFor', source.id, this.name);
  delete this.miningInformationFor(source).needsLorry;
};

Room.prototype.defcon = function() {
  let defcon;
  let defconTime;

  let roomName = this.name;
  let pastDefcon = Memory.rooms.defcon;
  let pastDefconTime = Memory.rooms.defconTime;
  // setup
  if(!pastDefcon || !pastDefconTime) {
    Memory.rooms[roomName].defcon = 0;
    Memory.rooms[roomName].defconTime = 0;
    pastDefcon = 0;
  }
  // are we under attack
  if(this.underAttack()) {
    let enemies = this.findEnemies();

    let isInvader = function(creep) {
      return creep.owner.username === 'Invader';
    }
    // Only stupid invaders, no problem
    if(enemies.every(isInvader)) {
      defcon = 1;
    // We are under attack by another fraction
    } else {
      defcon = 2;
      // restart timer
      defconTime = Game.time += 5000;
    }
  // We are save!
  } else {
    defcon = 0;
  }

  // defcon remains high
  if(defcon >= pastDefcon) {
    Memory.rooms[roomName].defcon = defcon;
    Memory.rooms[roomName].defconTime = defconTime;
  }
  // defcon can be reduced
  else if(Game.time > pastDefconTime) {
    Memory.rooms[roomName].defcon = defcon;
  }

  //TRASH
    // bring melee support
    if(defcon == 0 ||defcon == 1) {
        Game.flags['crusade'].memory.meleeLimit = 0;
    }

    // end melee support
    if(defcon == 2) {
        Game.flags['crusade'].memory.meleeLimit = 9;
    }

    // TODO
    // save mode WARNIG WARNIG if new wall === safeMode
    // if(this.walls().some((w) => w.hits < 10000)) {
    //     this.controller.activateSafeMode();
    // }

  return defcon;
};

Room.prototype.upgradeDefense = function(defcon, options={}) {
  // TODO: Defcon 2 has to remain a long time (to build more walls)
  // Defcon 3 has to trigger if a wall goes under a limit and should remain not long
  // and the wall limit should not increase at defcon 3

  // collect some information
  let finalWallHits = this.memory.defense.finalWallHits
  let upgradeTime = this.memory.defense.wallUpgradeTime;
  let maxWallHits = this.memory.defense.maxWallHits;
  let explorerEfficiency = 1 - this.memory.defense.explorerEfficiency;

  // Increase walls
  everyTicksFor(upgradeTime, this, function(room) {
    if(!maxWallHits && room.isStronghold()) {
      // set initial wall hits
      // TODO: Test - is this start scenario well adjusted
       room.memory.defense.maxWallHits = 1000;
    }
    else if(maxWallHits < finalWallHits) {
      // get our wall builders
      let explorers = _.values(Game.creeps).filter((c) => {
        return c.isRole('explorer')
          && !c.memory.hasOwnProperty('flagName')
          && c.memory.controllerId === room.controller.id
      });

      // how much can they work
      let theoRepairCapability = 0;
      explorers.forEach(function(creep){
        theoRepairCapability += creep.getAbilityOf('work');
      });

      let realRepairCapability = Math.round(
        theoRepairCapability - theoRepairCapability * explorerEfficiency
      );

      // how much energy do they need for that
      let energyNeed = upgradeTime * realRepairCapability;

      // great. lets set get them a rachable target
      let wallSegmets = room.walls().length;
      let increaseSegmentBy = Math.round((energyNeed * 100) / wallSegmets);

      maxWallHits += increaseSegmentBy;

      // save the value
      room.memory.defense.maxWallHits = maxWallHits;
      // and the amount of inrcreas (for explorer)
      room.memory.defense.lastIncrease = increaseSegmentBy;

      Logger.log(
        'Increased walls in', room.name,
        'by', increaseSegmentBy,
        'to', maxWallHits
      );
    }
  });
};

Room.prototype.stationaryFireControl = function(defcon) {
  // helper
  let sortByHits = function(a, b) {
    let aCreep = a.hits;
    let bCreep = b.hits;

    return aCreep - bCreep;
  };

  let towers = this.towers();

  if(defcon === 0) {
    towers.forEach((tower) => {
      // TODO: DRY CODE
      let casualty = this.casualtys()[0];

      // If we have casualtys -> heal them
      if(!_.isEmpty(casualty)) {
        tower.heal(casualty);
      }

      // Else repair all structures
      tower.repairInRoom();
    });
  }
  else if(defcon === 1) {
    towers.forEach((tower) => {
      tower.attackInRoom();
    });
  }
  else if(defcon === 2) {
    //TODO: Exact calculation (distance between enemies, find best target --> real fire control)
    let towersAttackPower = towers.length * 600 * (2 / 3);
    let enemies = this.find(FIND_ENEMY_CREEPS)

    let enemyHealPower;

    enemies.forEach((enemy) => {
      let healAbility = enemy.getAbility('heal');
      enemyHealPower += healAbility * 12;
    });

    towers.forEach((tower) => {
      //let target = enemies.sort(sortByHits)[0];

      // Too strong healers in room -> heal & repair instead of attack
      if(enemyHealPower >= towersAttackPower) {
        // TODO: DRY CODE
        let casualty = this.casualtys()[0];

        // If we have casualtys -> heal them
        if(!_.isEmpty(casualty)) {
          tower.heal(casualty);
        }

        // Else repair all structures
        tower.repairInRoom();
      // The healers are weak --> attack now
      } else {
        let options = {
          priorized : 'work'
        }
        tower.attackInRoom(options);
      }
    });
  }
};

Room.prototype.casualtys = function() {
  let sortByHits = function(a, b) {
    let aCreep = a.hits;
    let bCreep = b.hits;

    return aCreep - bCreep;
  };

  return this.find(FIND_MY_CREEPS, {
    filter: (creep) => { return creep.hits < creep.hitsMax }
  }).sort(sortByHits);
};

Room.prototype.findEnemies = function() {
  return this.find(FIND_HOSTILE_CREEPS, {
     filter: (c) => {
         return (allies.indexOf(c.owner.username.toLowerCase()) === -1);
     }
  });
}

//TODO: Research
// Room.prototype.getCostMatrix = function() {
//   let costMatrix;
//
//   if(!_.isEmpty(this.memory.costMatrix)) {
//     costMatrix = PathFinder.CostMatrix.deserialize(this.memory.costMatrix);
//   } else {
//     costMatrix = new PathFinder.CostMatrix();
//     this.memory.costMatrix = costMatrix.serialize();
//   }
//
//   return costMatrix;
// };