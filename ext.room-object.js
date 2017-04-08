RoomObject.prototype.nearContainers = function(distance = 1) {
  // returns [object, object]
  return this.pos.findInRange(FIND_STRUCTURES, distance, {
    filter: s => s.structureType === STRUCTURE_CONTAINER
  });
};

RoomObject.prototype.nearStorage = function(distance = 1) {
  // returns object
  return this.pos.findInRange(FIND_STRUCTURES, distance, {
    filter: s => s.structureType === STRUCTURE_STORAGE
  })[0];
};

RoomObject.prototype.hasCapacity = function(amount = 1) {
  return this.storeCapacity > _.sum(this.store) + amount;
};
