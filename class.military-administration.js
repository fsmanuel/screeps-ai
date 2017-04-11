const Administration = require('class.administration');

module.exports = class MilitaryAdministration extends Administration {
  vacancies(capacity) {
    this.inquire('localDefenseVacancies', capacity);
    this.inquire('remoteDefenseVacancies', capacity);

    return this._vacancies;
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
    let limit = 3;

    this.enqueueJobIfNeeded(role, options, limit);
  }
};
