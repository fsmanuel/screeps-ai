module.exports = function() {
  const target = Game.getObjectById(this.memory.containerId);

  if (target && this.pos.isEqualTo(target.pos)) {
    if (this.harvest(Game.getObjectById(this.memory.mineralId)) === OK) {
      let mineral = this.room.mineral().mineralType;
      // Drop the amount of energy that it mines in one tick
      this.drop(mineral, this.getActiveBodyparts(WORK) * 1);
    }
  } else {
    this.moveTo(target, {
      reusePath: 10
    });
  }
};