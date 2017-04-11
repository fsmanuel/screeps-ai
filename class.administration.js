module.exports = class Administration {
  constructor(node) {
    this.node = node;
    this._vacancies = [];
  }

  inquire(method, capacity) {
    if (this._vacancies.length >= capacity) { return; }

    this[method].call(this);
  }

  enqueueJobIfNeeded(role, options, limit, callback) {
    let creeps = this.node.creeps.filter(c => c.memory.role === role)

    // We apply all options to the filter
    if (!_.isEmpty(options)) {
      let keys = Object.keys(options);

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
}
