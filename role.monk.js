function moveTo(target) {
  let hostileCreeps = this.room.findEnemies();
  let enemies = this.pos.findInRange(hostileCreeps, 3);

  if (enemies) {
    let enemy = this.pos.findClosestByRange(enemies);

    this.do('rangedAttack', enemy);
  }

  // TODO: make it better!
  let injured = this.room.find(FIND_MY_CREEPS, {
    filter: (c) => c.hits < c.hitsMax
  });

  if (injured) {
    let friend = this.pos.findClosestByRange(injured);

    this.do('rangedHeal', friend);
    this.do('heal', friend);
  } else {
    this.heal(this);
  }

  if (!this.pos.isNearTo(target)) {
    this.moveTo(target);
  }
}

module.exports = function() {
  this.notifyWhenAttacked(false);

  let allowedDamageValue = -200;
  let damage = this.hits - this.hitsMax;

  let flag = Game.flags[this.memory.flagName];
  let withdrawalFlag = Game.flags[flag.memory.tacticalWithdrawalTo];

  if (flag.memory.tacticalPhase == 1) {
    // Safty first!
    if (
      damage <= allowedDamageValue || (
        damage > allowedDamageValue && damage < 0 &&
        withdrawalFlag.pos.roomName === this.room.name
      )
    ) {
      target = withdrawalFlag;
    } else {
      target = flag;
    }

  // Go to withdrawalFlag
  } else {
    target = withdrawalFlag;
  }

  moveTo.call(this, target);
};