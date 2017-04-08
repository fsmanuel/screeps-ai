module.exports = function() {
  this.notifyWhenAttacked(false);

  let flag = Game.flags[this.memory.flagName];

  if (flag.pos.roomName !== this.room.name) {
    this.moveTo(flag, {
      reusePath: 10
    });
  } else {
    let enemies = this.room.findEnemies();

    if(_.isEmpty(enemies)) {
      this.moveTo(flag, {
        reusePath: 10
      });
    } else {
      let nearEnemy = this.pos.findClosestByRange(enemies);

      if(this.rangedAttack(nearEnemy) === ERR_NOT_IN_RANGE) {
        this.moveTo(nearEnemy);
      }

      nearEnemy = this.pos.findClosestByRange(enemies);

      let range = this.pos.getRangeTo(nearEnemy);

      if(range < 3) {
        let direction = this.pos.getDirectionTo(nearEnemy);

        this.move(oposite[direction]);
      }
    }
  }
};

const oposite = {
  1 : 8,
  2 : 6,
  3 : 7,
  4 : 8,
  5 : 1,
  6 : 2,
  7 : 3,
  8 : 4
};