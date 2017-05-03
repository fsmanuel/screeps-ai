const Administration = require('class.administration');

// TODO:
// claimer
// local and remote upgrader
// local and remote explorer (lets try to have different tasks for them - walls, repair, )
module.exports = class StateAdministration extends Administration {
  runBureau() {
    this.globalEnergyDistribution();
  }

  // We presume that every room with a terminal has a storage!
  globalEnergyDistribution() {
    if (!this.node.room.terminal) { return; };

    let ownBudget = this.budget();

      // Care about your children
      this.node
        .children
        .forEach((node) => this.sendEnergyIfPossible(node, ownBudget));

      // Be nice to your parent
      if (this.node.parent) {
        // console.log(this.node.room.name, this.node.parent.room.name, ownBudget);
        this.sendEnergyIfPossible(this.node.parent, ownBudget)
      }
  }

  sendEnergyIfPossible(node, ownBudget) {
    // We are NOT profitable!
    if (ownBudget < 0 ) { return; }

    let minimumAmount = 10000;
    let budget = node.stateAdministration.budget();

    if (budget < 0) {
      let terminal = this.node.room.terminal;
      let senderRoomName = this.node.room.name;
      let receiverRoomName = node.room.name;

      // Call the amount to send
      let amount = budget * -1;
      if (amount > ownBudget) { amount = ownBudget; }

      // Substract transactionCost
      let transactionCost = Game.market.calcTransactionCost(
        amount,
        senderRoomName,
        receiverRoomName
      )
      amount = amount - transactionCost;

      // Send it if you can
      if (terminal.store[RESOURCE_ENERGY] > amount && amount > minimumAmount) {
        console.log(senderRoomName, amount, receiverRoomName);

        terminal.send(
          RESOURCE_ENERGY,
          amount,
          receiverRoomName,
          'globalEnergyDistribution'
        );

        // Reduce ownBudget
        ownBudget -= amount;
      }
    }
  }

  budget() {
    let amount = 0;

    let room = this.node.room;
    let terminal = room.terminal;
    if (!terminal) { return amount; }

    let terminalEnergy = terminal.store[RESOURCE_ENERGY];
    let terminalEnergyBuffer = room.memory.economy.terminalEnergyBuffer;

    let storageEnergy = room.storage.store[RESOURCE_ENERGY];
    let storageEnergyReserve = room.memory.economy.storageEnergyReserve;

    // Calc the amount to be balanced
    amount = (
      (terminalEnergyBuffer - terminalEnergy) +
      (storageEnergyReserve - storageEnergy)
    ) * -1;

    // Only request what we can store
    let freeStorage = terminal.storeCapacity - _.sum(terminal.store);
    if (amount < 0 && freeStorage * -1 > amount) {
      amount = freeStorage * -1;
    }

    return amount;
  }

  vacancies(capacity) {
    // Energy
    this.inquire('localUpgraderVacancies', capacity);

    return this._vacancies;
  }

  localUpgraderVacancies() {
    // console.log('upgrader');
    let role = 'upgrader';
    let limit = 1;
    let options = {
      body: this.bodyFor(role)
    };

    let room = this.node.room;
    let storage = room.storage;

    // // Level 1-7 have a dynamic limit
    if (this.node.controller.level < 8) {
      if (!_.isEmpty(storage)) {
        let storageEnergy = storage.store[RESOURCE_ENERGY];
        let energyReserve = room.memory.economy.storageEnergyReserve;

        // additional upgraders
        if (storageEnergy > energyReserve) {
          // everything above the storageEnergyReserve will spawn additional upgraders
          let performance = this.workPartsForUpgrader * 1500;;

          // TODO: Should we use partsFor?
          limit += Math.floor((storageEnergy - energyReserve) / performance);
        }
      } else {
        let containers = this.room.controller.nearContainers(4);

        // TODO: If there are more than one container
        let containerEnergy = containers[0].store[RESOURCE_ENERGY];

        // TODO: revision
        if (containerEnergy > 1333) {
          let upgrader = this.node.creeps.filter(c => c.memory.role === role)

          // 1333 results from the 'carry + carry * 1/3' condition of logistics (at 500 carryCap)
          limit = 1 + upgrader.length;
        }
      }
    }

    // but only up to the given count
    let maxUpgraderCount = room.memory.economy.maxUpgraderCount;
    if (limit > maxUpgraderCount) {
      limit = maxUpgraderCount;
    }

    this.enqueueJobIfNeeded(role, options, limit);
  }

  get workPartsForUpgrader() {
    let available = this.energyCapacityAvailable
    let utilityCost = this.node.controller.level * 2 * 50;

    return this.partsFor(available - utilityCost, 100);
  }

  bodyForUpgrader(options) {
    let level = this.node.controller.level;
    let utilityParts = level * 2;

    let workParts = this.workPartsForUpgrader;

    if (workParts + utilityParts > 50) {
      workParts = 50 - utilityParts;
    }

    // at level 8 we need only 15 WORK parts
    if (level === 8) {
      workParts = 15;
    }

    let body = [];
    for (let i = 0; i < workParts; i++) {
      body.push(WORK);
    }

    for (let i = 0; i < utilityParts / 2; i++) {
      body.push(CARRY);
      body.push(MOVE)
    }

    return body;
  }
}