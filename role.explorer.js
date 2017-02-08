let actAsJanitor = require('role.janitor');

module.exports = function() {
  // TODO: Find a flag that is not yet marked
  let target = Game.flags.W82N4;

  if (target.pos.roomName !== this.room.name) {
    this.moveTo(target, {
      reusePath: 10
    });
  } else {
    actAsJanitor.call(this);
  }

};
