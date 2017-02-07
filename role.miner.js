module.exports = function() {
  const target = Game.getObjectById(this.memory.containerId);

  if (this.pos.isEqualTo(target.pos)) {
    const ok = this.harvest(Game.getObjectById(this.memory.sourceId));

    if (ok === OK) {
      // Drop the amount of energy that it mines in one tick
      const energy = this.getActiveBodyparts(WORK) * 2;

      this.drop(RESOURCE_ENERGY, energy);
    }
  } else {
    this.moveTo(target, {
      reusePath: true
    });
  }
};
