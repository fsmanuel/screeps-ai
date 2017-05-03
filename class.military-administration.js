const Administration = require('class.administration');

module.exports = class MilitaryAdministration extends Administration {
  constructor(node) {
    super(node);
    this.attackFlags = [];
  }

  vacancies(capacity) {
    this.inquire('localDefenseVacancies', capacity);
    this.inquire('remoteDefenseVacancies', capacity);

    this.attackFlags
      .filter((flag) => flag.memory.active)
      .forEach((flag) => {
        this.inquire('warVacancies', capacity, { flagName: flag.name });
      });

    return this._vacancies;
  }

  warVacancies(options = {}) {
    let flag = Game.flags[options.flagName];
    if (_.isEmpty(flag)) { return; }

    let flagMemory = flag.memory;

    // Only some rooms fight this war!
    if (!flagMemory.includedRooms.includes(this.node.room.name)) { return; }

    // TODO: rename to crusade
    if (flagMemory.tactic == 'sabotageWithDeathblow') {
      let units = [
        'monk',
        'melee',
      ];

      let unitTypes = flagMemory.unitTypes;

      units
        .forEach((role) => {
          let limit = flagMemory[`${role}Limit`];
          let unitTypeCount = unitTypes[role].length;
          let callback = (creep) => { unitTypes[role].push(creep); }

          // Add body
          let options = _.clone(options);
          options.body = this.bodyFor(role, options);

          if (unitTypeCount < limit) {
            this._vacancies.push({ role, options, callback });
          }
        });
    }

    // if (flagMemory.tactic == 'destroy') {
    //   let units = [
    //     'destroyer',
    //   ];
    //
    //   let requiredUnits = flagMemory.requiredUnits;
    //
    //   units
    //     .forEach((role) => {
    //       let required = requiredUnits[role];
    //       let active = activeUnits[role].length;
    //       let callback = (creep) => { unitTypes[role].push(creep); }
    //
    //       if (unitTypeCount < limit) {
    //         this._vacancies.push({ role, options, callback });
    //       }
    //     });
    //
    //
    //     limit = flag.memory.requiredUnits.destroyer;
    //
    //     if(flag.memory.activeUnits.destroyer.length < limit) {
    //       creep = this.spawnForMilitary('destroyer', options, limit, setting);
    //
    //       if(creep) {
    //         flag.memory.activeUnits.destroyer.push(creep);
    //       }
    //     }
    // }
  }

  localDefenseVacancies() {
    this.defenseVacancies(this.node);
  }

  remoteDefenseVacancies() {
    this.node
      .children
      .forEach((child) => this.defenseVacancies(child));
  }

  defenseVacancies(node) {
    let flag = node.defendFlag();
    if (_.isEmpty(flag)) { return; }

    let role = 'defender';
    let options = {
      flagName: flag.name
    };
    let limit = 2;

    // Add body
    options.body = this.bodyFor(role, options);

    this.enqueueJobIfNeeded(role, options, limit);
  }

  bodyForMelee(options) {
    let armor = 6; // a 60 (max 8)
    let attack = 12; // a 130  (max 17)

    let body = [];
    for (let i = 0; i < armor; i++) {
      body.push(TOUGH);
      body.push(MOVE);
    }

    // Even on swamp we have a walk time of 3
    for (let i = 0; i < attack; i++) {
      body.push(MOVE);
      body.push(ATTACK);
    }

    return body;
  }

  bodyForMonk(options) {
    let armor = 8; // a 60
    let heal = 10; // a 300
    let range = 3; // a 200

    let body = [];
    for (let i = 0; i < armor; i++) {
      body.push(TOUGH);
      body.push(MOVE);
    }

    for (let i = 0; i < heal; i++) {
      body.push(HEAL);
      body.push(MOVE);
    }

    for (let i = 0; i < range; i++) {
      body.push(RANGED_ATTACK);
      body.push(MOVE);
    }

    return body
  }

  bodyForDefender(options) {
    // A TOUGH ATTACK(er) which is fast (twice MOVE than other parts)
    let parts = this.partsFor(1160, 290);

    let body = [];
    for (let i = 0; i < parts; i++) {
      body.push(TOUGH);
    }

    // Even on swamp we have a walk time of 3
    for (let i = 0; i < parts * 2; i++) {
      body.push(MOVE);
    }

    for (let i = 0; i < parts; i++) {
      body.push(ATTACK);
    }

    return body;
  }
};
