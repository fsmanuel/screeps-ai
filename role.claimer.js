module.exports = function() {
  const target = Game.flags[this.memory.flagName];;
  const isNearTo = this.pos.isNearTo(target.pos);

  // The first claimer marks the flag as a colony of the spawn
  if (isNearTo && _.isEmpty(target.memory)) {
    target.memory.spawnId = this.memory.spawnId;
  }

  if (isNearTo) {
    let action = 'reserveController';

    if (target.secondaryColor === COLOR_GREEN) {
      action = 'claimController'
    }

    this.do(action, this.room.controller);
  } else {
    this.moveTo(target, {
      reusePath: 10
    });
  }
};
