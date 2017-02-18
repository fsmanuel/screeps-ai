module.exports = function() {
  const target = Game.getObjectById(this.memory.containerId);

  if (target && this.pos.isEqualTo(target.pos)) {
    if (this.harvest(Game.getObjectById(this.memory.sourceId)) === OK) {
      // Drop the amount of energy that it mines in one tick
      this.drop(RESOURCE_ENERGY, this.getActiveBodyparts(WORK) * 2);
    }
  } else {
    this.moveTo(target, {
      reusePath: 10
    });
  }
};
