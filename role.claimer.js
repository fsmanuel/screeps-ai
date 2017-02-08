module.exports = function() {
  const target = Game.flags.W82N4;

  if (this.pos.isNearTo(target.pos)) {
    this.do('reserveController', this.room.controller);
  } else {
    this.moveTo(target, {
      reusePath: 10
    });
  }
};
