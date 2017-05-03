const Administration = require('class.administration');

module.exports = class MiningAdministration extends Administration {
  vacancies(capacity) {
    // Energy
    this.inquire('localEnergyMiningVacancies', capacity);

    // Distributer
    this.inquire('localDistributeVacancies', capacity);

    // Remote energy
    this.inquire('remoteEnergyMiningVacancies', capacity);

    // Minerals
    this.inquire('localMineralMiningVacancies', capacity);

    return this._vacancies;
  }

  localDistributeVacancies() {
    let room = this.node.room;

    // No storage or level 6 --> no distributor
    if (_.isEmpty(room.storage) || room.controller.level < 6) { return; }

    let limit = 1;
    let role = 'lorry';

    let options = {
      isLocal: true,
      task: 'distribute',
      containerId: room.storage.id
    };

    // Add body
    options.body = this.bodyFor(role, options);

    this.enqueueJobIfNeeded(role, options, limit);
  }

  localEnergyMiningVacancies() {
    this.energyMiningVacancies(this.node, { isLocal: true });
  }

  remoteEnergyMiningVacancies() {
    this.node
      .children
      .filter((child) => !child.room.hasSpawns())
      .forEach((child) => this.energyMiningVacancies(child, {
        isRemote: true
      }));
  }

  energyMiningVacancies(node, options = {}) {
    let room = node.room;

    let headcount = {
      miner: 1,
      lorry: 1
    };

    room
      .find(FIND_SOURCES)
      .forEach((target) => {
        let {
          sourceId,
          containerId,
          needsLorry
        } = room.miningInformationFor(target);

        // No container => no job
        if (!containerId) { return; }

        let defaults = _.assign({
          isEnergy: true,
          targetId: sourceId,
          containerId,
        }, options);

        Object.keys(headcount)
          .forEach((role) => {
            let limit = headcount[role];

            // Add body
            let options = _.clone(defaults);
            options.body = this.bodyFor(role, defaults);

            // Lorries have a task
            if (role === 'lorry') {
              options.task = 'mining';
            }

            this.enqueueJobIfNeeded(role, options, limit);
          });

        // If the source requested a lorry we increase the limit
        if (needsLorry) {
          let role = 'lorry';
          let limit = headcount[role] + 1;

          // Add body
          let options = _.clone(defaults);
          options.body = this.bodyFor(role, defaults);

          // Lorries have a task
          options.task = 'mining';

          this.enqueueJobIfNeeded(role, options, limit, () => {
            room.shippingLorryFor(target);
          });
        }
      });
  }

  localMineralMiningVacancies(options = {}) {
    let room = this.node.room;
    if (!room || !room.hasExtractor()) { return; }

    let mineral = room.mineral();
    if (!mineral || mineral.mineralAmount === 0) { return; }

    let container = mineral.nearContainers()[0];
    if (!container) { return; }

    let headcount = {
      miner: 1,
      lorry: 1,
    };

    let defaults = _.assign({
      isMineral: true,
      isLocal: true,
      targetId: mineral.id,
      containerId: container.id,
    }, options);

    Object.keys(headcount)
      .forEach((role) => {
        let limit = headcount[role];

        // Add body
        let options = _.clone(defaults);
        options.body = this.bodyFor(role, defaults);

        // Lorries have a task
        if (role === 'lorry') {
          options.task = 'mining';
        }

        this.enqueueJobIfNeeded(role, options, limit);
      });
  }

  // TODO: Should be private
  bodyForMiner(options) {
    let body = [];

    // Mineral
    if (options.isMineral) {
      let parts = this.partsFor(4500, 450);

      for (let i = 0; i < parts; i++) {
        body.push(WORK);
        body.push(WORK);
        body.push(WORK);
        body.push(WORK);
        body.push(MOVE);
      }

    // Energy
    } else {
      let available = this.energyCapacityAvailable;
      // 350
      let workParts = [WORK, WORK, WORK];
      let moveParts = [MOVE];

      if (available >= 450) { workParts.push(WORK); }
      if (available >= 550) { workParts.push(WORK); }

      // Perfect mining reached - we make it faster
      if (available >= 600) { moveParts.push(MOVE); }
      if (available >= 650) { moveParts.push(MOVE); }

      body = workParts.concat(moveParts);
    }

    return body;
  }

  // TODO: Should be private
  bodyForLorry(options) {
    // Default
    let energy = 750;

    // Mineral
    if (options.isMineral) {
      energy = 1050;
    }

    // Remotes
    if (options.isRemote) {
      if (this.node.controller.level > 5) { energy = 2500; }
    }

    // Distributer
    if (options.task === 'distribute') {
      // TODO: I don't think we need it that big
      energy = 2500;
    }

    // Create a body with twice as many CARRY as MOVE parts
    let parts = this.partsFor(energy, 150);

    let body = [];

    for (let i = 0; i < parts * 2; i++) {
      body.push(CARRY);
      if (i < parts) { body.push(MOVE); }
    }

    return body;
  }
};
