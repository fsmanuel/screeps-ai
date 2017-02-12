const Logger = require('class.logger');
const {
  everyTicks
} = require('util.helpers');

const runOrder = {
  logistics: 1,
  lorry: 2
};

module.exports = {
  setup() {
    // Convert flags to an array
    this.flagsToArray();

    // TODO: Find a way to run it everyTicks (we can not save it in memory!)
    this.updateClaims();

    // If enemies are detected set flags
    // TODO: We can do it every 5 ticks
    this.setDefenseFlags();

    // Cleanup memory
    this.cleanup();
  },

  // Spawn
  spawn() {
    for (let name in Game.spawns) {
      Game.spawns[name].autoSpawnCreeps(this.claims, this.defendFlags);
    }
  },

  run() {
    // We sort the creeps by role via runOrder
    _
      .values(Game.creeps)
      .sort(function(a, b) {
        let aCreep = runOrder[a.memory.role] || 10;
        let bCreep = runOrder[b.memory.role] || 10;

        return aCreep - bCreep;
      })
      .forEach(function(creep) {
        if (creep) {
          creep.run();
        }
      });
  },

  defendAndRepair() {
    // Increase walls
    everyTicks(300, function() {
      // TODO: Add logic for more rooms
      // TODO: Add logic for level
      if (!Memory.maxWallHits) {
        Memory.maxWallHits = 52000;
      }

      // TODO: revisit value
      Memory.maxWallHits += 1000;
    });

    const towers = _.filter(
      Game.structures,
      s => s.structureType === STRUCTURE_TOWER
    );

    for (let tower of towers) {
      tower.defend();
    }
  },

  // Helper
  flagsToArray() {
    this.flags = _.toArray(Game.flags);
  },

  // Claims are represented by BLUE flags
  // Returns Array of Flag
  updateClaims() {
    this.claims = this.flags.filter(f => f.color === COLOR_BLUE);
  },

  // Defense are represented by RED flags
  setDefenseFlags() {
    this.claims.forEach(flag => flag.pos.setDefenseFlag());

    this.defendFlags = this.flags.filter(f => f.color === COLOR_RED);
  },

  cleanup() {
    for(var name in Memory.creeps) {
      if (!Game.creeps[name]) {
        delete Memory.creeps[name];
        Logger.log('Clearing non-existing creep memory:', name);
      }
    }
  }
};
