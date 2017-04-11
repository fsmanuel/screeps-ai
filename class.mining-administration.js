const Administration = require('class.administration');

module.exports = class MiningAdministration extends Administration {
  vacancies(capacity) {
    this.inquire('localEnergyMiningVacancies', capacity);
    this.inquire('remoteEnergyMiningVacancies', capacity);

    return this._vacancies;
  }

  localEnergyMiningVacancies() {
    this.energyMiningVacancies(this.node);
  }

  remoteEnergyMiningVacancies() {
    this.node
      .children
      .filter((child) => !child.room.hasSpawns())
      .forEach((child) => this.energyMiningVacancies(child));
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
        if (!containerId) { return creep; }

        // TODO: add targetId
        let options = {
          sourceId,
          containerId,
          targetRoom: null
        };

        Object.keys(headcount)
          .forEach((role) => {
            let limit = headcount[role];
            this.enqueueJobIfNeeded(role, options, limit);
          });

        // If the source requested a lorry we increase the limit
        if (needsLorry) {
          let role = 'lorry';
          let limit = headcount[role] + 1;
          this.enqueueJobIfNeeded(role, options, limit, () => {
            room.shippingLorryFor(target);
          });
        }
      });
  }
};
