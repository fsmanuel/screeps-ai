// Extends
require('ext.creep');
require('ext.room-object');
require('ext.room-position');
require('ext.spawn');
require('ext.structure-tower');

let utilLoop = require('util.loop');

module.exports.loop = function () {
  utilLoop.setup();
  utilLoop.spawn();
  utilLoop.run();

  // Defence
  utilLoop.defendAndRepair();

  // TODO: Attack!
};
