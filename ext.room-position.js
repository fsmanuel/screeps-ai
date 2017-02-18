const Logger = require('class.logger');
const {
  generateId
} = require('util.helpers');

RoomPosition.prototype.findClosestFlag = function(color, secondaryColor) {
  if (secondaryColor === undefined) {
    secondaryColor = color;
  }

  return this.findClosestByRange(FIND_FLAGS, {
    filter: s => s.color === color && s.secondaryColor === secondaryColor
  });
};

RoomPosition.prototype.findEnemies = function() {
  return this.findClosestByRange(FIND_HOSTILE_CREEPS);
};

RoomPosition.prototype.setDefenseFlag = function() {
  // Check if there is a RED flag
  let flag = this.findClosestByRange(FIND_FLAGS, {
    filter: s => s.color === COLOR_RED
  });
  let enemies = this.findEnemies();

  // Setup first strike
  if (!flag && enemies) {
    let flagName = `attack-${generateId()}`;
    this.createFlag(flagName, COLOR_RED);
  }

  // Reenable if enemies are arround
  if (flag && flag.secondaryColor === COLOR_GREEN && enemies) {
    flag.setColor(COLOR_RED, COLOR_RED);
  }

  // Log if we have enemies
  if (flag && flag.secondaryColor === COLOR_RED) {
    Logger.log(
      `We are under attack!`,
      JSON.stringify(Game.flags[flag.name].pos)
    );
  }

  // Cleanup
  if (flag && flag.secondaryColor !== COLOR_GREEN && !enemies) {
    flag.setColor(COLOR_RED, COLOR_GREEN);

    Logger.log(`The enemy is defeated!`);
  }
};
