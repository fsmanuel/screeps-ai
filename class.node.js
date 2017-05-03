const JobCenter = require('class.job-center');
const MilitaryAdministration = require('class.military-administration');
const MiningAdministration = require('class.mining-administration');
const StateAdministration = require('class.state-administration');

const {
  everyTicks
} = require('util.helpers');

module.exports = class Node {
  constructor(id, data = {}) {
    this.id = id;
    this.data = data;
    this.children = [];
    this.parent = null;

    this._cache = new Map;
  }

  get controller() {
    return Game.getObjectById(this.id);
  }

  get room() {
    return this.controller.room;
  }

  get creeps() {
    // TODO: Figure out how we can cache it
    // if (this._creeps) { return this._creeps; }

    this._creeps = _
      .toArray(Game.creeps)
      .filter(creep => creep.memory.controllerId === this.id);

    return this._creeps;
  }

  // Job center
  get jobCenter() {
    return this.fromCache('job-center');
  }

  runJobCenter() {
    if (!this.room.hasSpawns()) { return; }

    this.jobCenter.run();
  }

  // Military administration
  get militaryAdministration() {
    return this.fromCache('military-administration');
  }

  // TODO: move defendFlag logic in here and save the flagName in cache
  defendFlag() {
    return this.room.find(FIND_FLAGS, {
      filter: f => f.color === COLOR_RED && f.secondaryColor === COLOR_RED
    })[0];
  }

  // Mining administration
  get miningAdministration() {
    return this.fromCache('mining-administration');
  }

  // State administration
  get stateAdministration() {
    return this.fromCache('state-administration');
  }

  fromCache(key) {
    let cache = this._cache;
    if (cache.has(key)) { return cache.get(key); }

    let instance;

    switch (key) {
      case 'job-center':
        instance = new JobCenter(this);
        break;
      case 'military-administration':
        instance = new MilitaryAdministration(this);
        break;
      case 'mining-administration':
        instance = new MiningAdministration(this);
        break;
      case 'state-administration':
        instance = new StateAdministration(this);
        break;
      default:
        console.log('Class not found', key);
    }

    // console.log(key);
    cache.set(key, instance);

    return instance;
  }

  debug() {
    console.log(JSON.stringify.apply(this, ...arguments));
  }
}
