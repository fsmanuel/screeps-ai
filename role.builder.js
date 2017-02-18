let actAsUpgrader = require('role.upgrader');

// TODO: If you are working leave the street
// this.rememberTo(
//   () => this.moveAwayFromStreet();
//   !this.hasMoved(),
//   {
//     key: 'noMove',
//     limit: 3
//   }
// );

module.exports = function(autoPilot) {
  let target;

  // Build
  // This strategy is for efficiency
  if (autoPilot) {
    target = this.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);

  // This strategy is for user control
  } else {
    target = this.room.find(FIND_CONSTRUCTION_SITES)[0];
  }

  if (target) {
    this.do('build', target);
  } else {
     actAsUpgrader.call(this);
  }
};
