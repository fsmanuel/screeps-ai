// Extends
require('ext.creep');
require('ext.room-position');
require('ext.source');
require('ext.spawn');
require('ext.structure');
require('ext.structure-tower');

let utilLoop = require('util.loop');

module.exports.loop = function () {
  utilLoop.setup();
  utilLoop.spawn();
  utilLoop.run();
  utilLoop.attack();
};
