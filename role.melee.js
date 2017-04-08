module.exports = function() {
  this.notifyWhenAttacked(false);

  let allowedDamageValue = 300;
  let damage = this.hitsMax - this.hits;

  let flag = Game.flags[this.memory.flagName];
  let withdrawalFlag = Game.flags[flag.memory.tacticalWithdrawalTo];

  const phase = flag.memory.tacticalPhase;

  let target;

  // TODO: They don't attack right now
  if (phase === 1) {
    target = withdrawalFlag;

  } else {
    // Wir sind im arsch
    if (damage >= allowedDamageValue) {
      target = withdrawalFlag;
    } else {
      target = flag;
    }
  }

  let hostileCreeps = this.room.findEnemies();
  let enemies = target.pos.findInRange(hostileCreeps, 48);
  let enemy = this.pos.findClosestByRange(enemies);

  // Everyone in the room but no enemy
  if (phase === 3 && _.isEmpty(enemy)) {
    //TODO: this includes attacks against allies
    let enemies = flag.pos.findInRange(FIND_STRUCTURES, 1);
    enemy = this.pos.findClosestByPath(enemies);
  }

  // Right next to you!
  this.attack(enemy);

  if (_.isEmpty(enemy)) {
    this.moveTo(target);
  } else {
    this.do('attack', enemy);
  }
};