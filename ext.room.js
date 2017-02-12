Room.prototype.containers = function() {
  return this.find(FIND_STRUCTURES, {
    filter: s => s.structureType === STRUCTURE_CONTAINER
  });
};

Room.prototype.towers = function() {
  return this.find(FIND_STRUCTURES, {
    filter: s => s.structureType === STRUCTURE_TOWER
  });
};

Room.prototype.hasTowers = function() {
  return !_.isEmpty(this.towers());
};

Room.prototype.spawns = function() {
  return this.find(FIND_MY_SPAWNS);
};

Room.prototype.hasSpawns = function() {
  return !_.isEmpty(this.spawns());
};

