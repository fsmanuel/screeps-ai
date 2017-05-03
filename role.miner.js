module.exports = function() {
  let container = Game.getObjectById(this.memory.containerId);

  if (container && this.pos.isEqualTo(container.pos)) {
    // TODO: Remove mineralId and sourceId after migration
    let target = Game.getObjectById(
      this.memory.mineralId ||
      this.memory.sourceId ||
      this.memory.targetId
    )

    if (this.harvest(target) === OK) {
      let type;
      let amount;

      // Energy
      if (this.memory.isEnergy) {
        type = RESOURCE_ENERGY;
        amount = this.getActiveBodyparts(WORK) * 2;

      // Mineral
      } else if (this.memory.isMineral) {
        type = this.room.mineral().mineralType;
        amount = this.getActiveBodyparts(WORK) * 1;
      }

      this.drop(type, amount);
    }
  } else {
    this.moveTo(container, {
      reusePath: 10
    });
  }
};
