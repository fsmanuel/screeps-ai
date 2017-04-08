module.exports = function() {
  this.getAbilityOf('work')

  if(this.carry[RESOURCE_ENERGY] <= this.getAbilityOf('work')) {
    this.getEnergy(true, false);
  }
  this.do('upgradeController', this.room.controller);

  /*
  TODO:
  if(this.room.memory.defcon >= 2) {let actAsExplorer = require('role.explorer');}
  --> circular reference
  */
};
