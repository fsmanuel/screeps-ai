// Extends
require('ext.creep');
require('ext.room');
require('ext.room-object');
require('ext.room-position');
require('ext.spawn');
require('ext.structure');
require('ext.structure-container');
require('ext.structure-tower');

let utilLoop = require('util.loop');

module.exports.loop = function () {
  utilLoop.setup();

  // Keep the economy running!
  utilLoop.run();

  // Defend our world...
  utilLoop.defendAndRepair();

  // TODO: Attack!

  // TODO: We should probably spawn at the end of the tick?!
  utilLoop.spawn();
};
