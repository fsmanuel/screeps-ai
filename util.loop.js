const Logger = require('class.logger');
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

  // TODO: rename in defendAndRepair
  attack() {
    const towers = _.filter(
      Game.structures,
      s => s.structureType === STRUCTURE_TOWER
    );

    for (let tower of towers) {
      tower.defend();
    }
  }
};
