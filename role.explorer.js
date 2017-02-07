module.exports = function() {
  const target = Game.flags.W82N4;

  if (target.room) {
    this.do('reserveController', target.room.controller);
  } else {
    this.moveTo(target, {
      reusePath: true
    });
  }
};
