const Logger = require('class.logger');
const {
  everyTicks
} = require('util.helpers');

const runOrder = {
  harvester: 1,
  lorry: 2
};

module.exports = {
  setup() {
    for(var name in Memory.creeps) {
      if (!Game.creeps[name]) {
        delete Memory.creeps[name];
        Logger.log('Clearing non-existing creep memory:', name);
      }
    }
  },

  spawn() {
    for (let name in Game.spawns) {
      Game.spawns[name].autoSpawnCreeps();
    }
  },

  run() {
    // let ok = Game.creeps.Hailey
    //   .do('reserveController', Game.flags.W82N4.room.controller);
    // console.log(ok);

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
  }
};
