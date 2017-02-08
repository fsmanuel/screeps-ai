RoomObject.prototype.containers = function() {
  return this.pos.findInRange(FIND_STRUCTURES, 1, {
    filter: s => s.structureType === STRUCTURE_CONTAINER
  });
};
