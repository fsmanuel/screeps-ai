Structure.prototype.hasFlag = function(color, secondaryColor) {
  if (secondaryColor === undefined) {
    secondaryColor = color;
  }

  const flags = this.pos.findInRange(FIND_FLAGS, 0, {
    filter: s => s.color === color && s.secondaryColor === secondaryColor
  });

  return !_.isEmpty(flags);
};
