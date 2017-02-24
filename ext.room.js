const {
  rememberToFor
} = require('util.helpers');

Room.prototype.rememberToFor = rememberToFor;

Room.prototype.constructionSites = function() {
  return this.find(FIND_MY_CONSTRUCTION_SITES);
};

Room.prototype.hasConstructionSites = function() {
  return !_.isEmpty(this.constructionSites());
};

// Containers
Room.prototype.containers = function() {
  return this.find(FIND_STRUCTURES, {
    filter: s => s.structureType === STRUCTURE_CONTAINER
  });
};

Room.prototype.hasContainers = function() {
  return !_.isEmpty(this.containers());
};

// Spawns
Room.prototype.spawns = function() {
  return this.find(FIND_MY_SPAWNS);
};

Room.prototype.hasSpawns = function() {
  return !_.isEmpty(this.spawns());
};

// Towers
Room.prototype.towers = function() {
  return this.find(FIND_STRUCTURES, {
    filter: s => s.structureType === STRUCTURE_TOWER
  });
};

Room.prototype.hasTowers = function() {
  return !_.isEmpty(this.towers());
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
  const soloContainerIds = this.containers()
    .filter((c) => !sourceContainerIds.includes(c.id))
    .map((c) => c.id);

  this.memory.soloContainerIds = soloContainerIds;
};

// Room.prototype.optimizeSourceContainers = function() {
//   const bla = function(id) {
//     let source = this.memory.sources.find((s) => s.containerId === id);
//
//     if (source) {
//       s
//     }
//   };
//
//   this.memory.soloContainerIds.forEach((id) => {
//     let container = Game.getObjectById(id);
//
//     this.rememberToFor(
//       () => ,
//       container.isFullOf(RESOURCE_ENERGY),
//       {
//         id: container.id,
//         key: 'containerNeedsLorryCount',
//         limit: 300
//       }
//     );
//   });
//
// };





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
  // if (this.name !== 'W81N5') { return; }
  // _
  //   .forEach(this.memory.streetMap, (value, x) => {
  //     _.forEach(value, (value, y) => {
  //       this.visual.rect(parseInt(x) - 0.5, parseInt(y) - 0.5, 1, 1, {
  //         fill: 'red',
  //         opacity: value / 1000
  //       })
  //     })
  //   })
};
