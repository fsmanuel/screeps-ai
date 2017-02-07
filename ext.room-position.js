RoomPosition.prototype.findClosestFlag = function(color, secondaryColor) {
  if (secondaryColor === undefined) {
    secondaryColor = color;
  }

  return this.findClosestByRange(FIND_FLAGS, {
    filter: s => s.color === color && s.secondaryColor === secondaryColor
  });
};
