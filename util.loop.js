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
    everyTicks(2, () => this.setDefenseFlags());

    // Cleanup memory
    this.cleanup();
  },

  // Spawn
  spawn() {
    // Collect creeps population governed by the spawn aka census
    Object
      .keys(Game.spawns)
      .forEach((spawn) => {
        Game.spawns[spawn].collectCreepsData();
      });

    // Then we autoSpawnCreeps
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
    // Memory.maxWallHits = 350000;

    // Increase walls
    everyTicks(400, function() {
      // TODO: Should be limited to spawns with walls and min one tower
      _
        .toArray(Game.spawns)
        // TODO: Filter for main spawns (!memory.slave)
        .forEach((spawn) => {

          // TODO: Revisit value
          // TODO: Pick the right start. It should be arround or a bit over a container
          if (!spawn.room.memory.maxWallHits) {
            spawn.room.memory.maxWallHits = 350000;
          }

          // TODO: I guess from level 3-5 1000 was a good thing
          // TODO: if we are on level 5 with the controller in the room we should increase to 1000-2000
          spawn.room.memory.maxWallHits += 1000;
          Logger.log(
            'Increased walls:',
            spawn.room.name,
            spawn.room.memory.maxWallHits
          );
        });
    });

    _
      .toArray(Game.structures)
      .filter(s => s.structureType === STRUCTURE_TOWER)
      .forEach((tower) => {
        // TODO: WAR - Add war mode aka factor = 1
        // TODO: If the energy level is too low set to 0.25 or 0 (collect from rooms)
        tower.defend()
      });
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
    this.claims.forEach((flag) => {
      // console.log(JSON.stringify(flag.room));
      if (flag.room) {
        flag.pos.setDefenseFlag();
      }
    });

    this.defendFlags = this.flags.filter((f) => {
      return f.color === COLOR_RED && f.secondaryColor === COLOR_RED;
    });
  },

  cleanup() {
    Object
      .keys(Memory.creeps)
      .forEach((creep) => {
        if (!Game.creeps[creep]) {
          delete Memory.creeps[creep];
          // Logger.log('Clearing non-existing creep memory:', creep);
        }
      });
  }
};
