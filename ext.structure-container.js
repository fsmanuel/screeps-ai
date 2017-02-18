StructureContainer.prototype.isFullOf = function(resource) {
  return this.store[resource] === this.storeCapacity;
};
