module.exports = class Administration {
  constructor(node) {
    this.node = node;
    this._vacancies = [];
  }

  get energyCapacityAvailable() {
    return this.node.room.energyCapacityAvailable;
  }

  enqueueJobIfNeeded(role, options, limit, callback) {
    // Remove targetId and task
    let ignoredKeys = [
      'body',
      'isLocal',
      'isRemote',
      'isEnergy',
      'isMineral',
      'targetId',
    ];

    let creeps = this.node.creeps.filter(c => c.memory.role === role)

    // We apply all options without ignoredKeys to the filter
    if (!_.isEmpty(options)) {
      let keys = Object
        .keys(options)
        .filter((key) => !ignoredKeys.includes(key));

      creeps = creeps
        .filter((creep) => {
          return keys
            .map(key => creep.memory[key] === options[key])
            .every(v => v);
        });
    }

    // console.log(this.node.room.name, creeps.length, limit);
    if (creeps.length < limit) {
      this._vacancies.push({ role, options, callback });
    }
  }

  inquire(method, capacity, options = {}) {
    if (this._vacancies.length >= capacity) { return; }

    if (this[method]) {
      this[method](options);
    }
  }

  bodyFor(role, options = {}) {
    let method = `bodyFor${_.capitalize(role)}`;

    if (this[method]) {
      return this[method](options);
    }
  }

  partsFor(max, cost) {
    let available = this.energyCapacityAvailable;
    if (max > available) { max = available; }

    return Math.floor(max / cost);
  }
}
