// Extends
require('ext.creep');
require('ext.room');
require('ext.room-object');
require('ext.room-position');
require('ext.spawn');
require('ext.structure');
require('ext.structure-container');
require('ext.structure-controller');
require('ext.structure-tower');

let utilLoop = require('util.loop');

module.exports.loop = function () {
  utilLoop.setup();

  // Keep the economy running!
  utilLoop.run();

  // Defend our world...
  utilLoop.defense();

  // TODO: Attack!
  utilLoop.attack();

  // TODO: We should probably spawn at the end of the tick?!
  utilLoop.spawn();

  utilLoop.trade();

  //utilLoop.test();
};
