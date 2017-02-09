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
  let flag = this.findClosestFlag(COLOR_RED);

  if (!flag && this.findEnemies()) {
    let flagName = `attack-${generateId()}`;
    this.createFlag(flagName, COLOR_RED);

    Logger.log(
      `We are under attack!`,
      JSON.stringify(Game.flags[flagName].pos)
    );

  // Cleanup
  } else if (flag) {
    flag.remove();

    Logger.log(`The enemy is defeated!`);
  }
};
