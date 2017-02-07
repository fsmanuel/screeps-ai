let actAsUpgrader = require('role.upgrader');

function build() {
  let target;

  // Build
  // This strategy is for efficiency
  if (Game.flags.autoPilot) {
    target = this.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);

  // This strategy is for user control
  } else {
    let targets = this.room.find(FIND_CONSTRUCTION_SITES);
    if (targets.length) {
      target = targets[0]
    }
  }

  if (target) {
    this.do('build', target);
  } else {
     actAsUpgrader.call(this);
  }
}

module.exports = function() {
  // let target;
  //


  let target = Game.flags.W82N4;

// console.log(this.room);
  if (target && (target.room =! this.room)) {
    this.moveTo(target, {
      reusePath: true
    });
  } else {
    build.call(this);
  }

};
