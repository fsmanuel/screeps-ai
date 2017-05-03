module.exports = class JobCenter {
  constructor(node) {
    this.node = node;
    this.jobs = [];
  }

  // TODO: rename
  run() {
    let idleSpawns = this.node.room.spawns().filter((s) => !s.spawning);
    this.spawnCapacity = idleSpawns.length;

    let jobs = this.openJobPositions();

    idleSpawns.forEach((spawn) => {
      let job = jobs.shift();

      // if (this.node.room.name === 'W81N1') {
      //   console.log(JSON.stringify(job));
      // }

      if (job) {
        // TODO: remove empty settings by moving them into options
        spawn.createCustomCreep(job.role, job.options, {}, job.callback);
      }
    });
  }

  jobsFor(administration) {
    let limit = this.spawnCapacity - this.jobs.length;
    let method = _.camelCase(administration);

    return this.node[method].vacancies(limit);
  }

  // TODO: Make the following methods private

  // Returns an array of jobs
  openJobPositions() {
    // TODO: Add priority
    // We should think about options to call the administrations more than once but trigger only some job inquireis e.g.:
    // this.inquire(this, 'jobsFor', 'state-administration', {
    //   survival: true
    // });

    this.inquire(this, 'jobsFor', 'military-administration');
    this.inquire(this, 'jobsFor', 'state-administration');
    this.inquire(this, 'jobsFor', 'mining-administration');

    // TODO: I guess we don't need the flatten here anymore
    return _.flatten(this.jobs);
  }

  inquire(context, method, ...args) {
    if (this.jobs.length >= this.spawnCapacity) { return; }

    let callback = typeof method === 'function' ? method : context[method];

    this.jobs.push(callback.apply(context, args));
    this.jobs = _.flatten(this.jobs);
  }
};
