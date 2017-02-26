const Logger = require('class.logger');
const {
  everyTicks
} = require('util.helpers');

StructureController.prototype.autoSpawnCreeps = function(claimFlags, defendFlags, attackFlags) {
  let spawns = this.room.find(FIND_MY_SPAWNS);

  return spawns.reduce((creep, spawn) => {
      if (creep) { return creep; }

      return spawn.autoSpawnCreeps(claimFlags, defendFlags, attackFlags);
  }, undefined);
};

/*
  Helpers
*/

// Creeps governed by the controller
StructureController.prototype.collectCreepsData = function() {
  // Get all creeps
  this.creeps = _.toArray(Game.creeps).filter(c => c.memory.controllerId === this.id);

  // Collect creeps statistics
  this.creepsCounts = this.creeps.reduce(function(data, creep) {
    let role = creep.memory.role;

    data[role] = data[role] ? data[role] + 1 : 1;
    return data;
  }, {});

  // Show population per spawn
  everyTicks(100, () => {
    Logger.log(this.room.name , JSON.stringify(this.creepsCounts));
  });
};

// TODO: Unused
StructureController.prototype.claims = function() {
  return this.room.find(FIND_FLAGS, {
    filter: (flag) => {
        return flag.memory.controllerId === this.id &&
            flag.room.controller.level === 0;
    }
  });
};