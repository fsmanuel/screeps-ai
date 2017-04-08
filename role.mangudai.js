module.exports = function() {
  this.notifyWhenAttacked(false);

  let centerRoom = this.room.name;

  // Setup
  // let report = { };
  this.memory.status = this.memory.status || 'onMarch';
  this.memory.history = this.memory.history || [];

  let status = this.memory.status;
  let flag = Game.flags[this.memory.flagName];

  // Update
  let history = this.memory.history;
  if(history.length > 5) {
    // delete last entry
    this.memory.history = history.splice(5,1);
  }

  // let historyCount = this.memory.history.count;
  // if(this.room.name != this.memory.history[historyCount-1]) {
  //   let newEntry = { };
  //   newEntry[this.room.name] = 'unreported';
  //   flag.memory.history.unshift(newEntry);
  // }

  // Action

  if(this.hits < this.hitsMax / 2) {
    this.memory.status = 'onMarch';
  }

  if(status === 'onMarch') {
    if(this.room.name != flag.pos.roomName) {
      this.moveTo(flag, {
        reusePath: 10
      });
    } else {
      this.memory.status = 'inBase';
      let report = { };
      report[this.room.name] = 'base';
      this.memory.history.unshift(report);

      flag.memory.requiredUnits.mangudai = 0;
    }
  }

  if(status === 'inBase') {
    if(flag.memory.operate  && this.pos.isNearTo(flag)) {
      this.memory.status = 'onMission';
    } else {
      this.moveTo(flag, {
        reusePath: 10
      });
    }
  }

  if(status === 'onMission') {
    let attackRooms = flag.memory.operationalArea.attackRooms;

    if(!attackRooms.some((room) => room === this.room.name)) {
      moveStrategic(flag, this);
    } else {
      raid(flag, this);
    }
  }

  if(status === 'atWithdrawal') {
    // TODO: here we can track if the last x = 3 rooms are a  withdrawal, than back to base

    // If we enter a new room after withdraw we can go in normal mission mode
    if(this.room.name !== Object.keys(this.memory.history[0])[0]) {

      this.memory.status = 'onMission';
      console.log('raid after withdraw');
      moveStrategic(flag, this);
    }
    else {
      moveStrategic(flag, this);
    }
  }

  //look for enemys
  let hostileCreeps = this.room.findEnemies();
  let enemysOnWay = this.pos.findInRange(hostileCreeps, 3);
  if(!_.isEmpty(enemysOnWay)) {
    this.rangedAttack(enemysOnWay[0]);
  }

  // last action is heal
  if(this.hits < this.hitsMax) {
    this.heal(this);
  }

};

// move strategic

let moveStrategic = function(flag, creep, options) {
  // collect room informations
  if(creep.room.name !== Object.keys(creep.memory.history[0])[0]) {
    let report = { };
    // check for some creeps
    let hostileCreeps = creep.room.findEnemies();
    // no one here --> room is clean
    if(_.isEmpty(hostileCreeps)) {
      report[creep.room.name] = 'empty';
      creep.memory.history.unshift(report);
    } else{
      report[creep.room.name] = 'activity';
      creep.memory.history.unshift(report);
    }
  }

  // creep has already a path we can follow
  if(!_.isEmpty(creep.memory.path)) {
    // look if there are creeps near by
    creeps = creep.pos.findInRange(FIND_CREEPS, 1);
    // if not, move the path we have
    if(!_.isEmpty(creeps)) {
      if(creep.moveByPath(creep.memory.path) !== ERR_NOT_FOUND) {
        return;
      } else {
        console.log('reset path');
        creep.memory.path = null;
      }
    }
  }

  //TODO: if we have a target we can continue to move execution
  let target = Game.flags[flag.memory.targetFlagName] || null;

  // Possible exist from this room
  let possible = Game.map.describeExits(creep.room.name);

  let attack = flag.memory.operationalArea.attackRooms;
  let withdraw = flag.memory.operationalArea.withdrawalRooms;
  let home = flag.memory.operationalArea.homeBases;
  let enemy = flag.memory.operationalArea.enemyBases;

  let history = creep.memory.history;

  // compareFunction
  // sort the possibilities in order of how long a last visit is ago
  // the resulting order is from right to left
  // possibilities which are not in history are on the far right
  let byHistory = function(a, b) {
    let aPossibility = history.findIndex((entry) => entry === a)
    let bPossibility = history.findIndex((entry) => entry === b)

    return bPossibility - aPossibility;
  };

  // make the object to a sortable array
  // sort it by history
  // reverse the sort
  let sorted = _.valuesIn(possible).sort(byHistory).reverse();

  //helper
  let checkHistory = function(room, report) {
    return history.some((e) => e[room] === report);
  };

  let checkLastRoom = function(room) {
    if(_.isEmpty(creep.memory.history[1])) { return; }
    return room == Object.keys(creep.memory.history[1])[0];
  };

  // use a room we should attack
  if(_.isEmpty(target)) {
    target = sorted.find(function(room){
      if(attack.some((a) => a === room) && !checkHistory(room, 'guarded')) {
        // do not select the last room
        if(!checkLastRoom(room)) {
          return room;
        // except this is the only walkable
        } else if(sorted.length == 1) {
          return room;
        // or we are at withdraw
        } else if(creep.memory.status === 'atWithdrawal') {
          return room;
        }
      }
    });
  }
  // use a withdrawal room as option
  if(_.isEmpty(target)) {
    target = sorted.find(function(room){
      if(withdraw.some((a) => a === room) && !checkHistory(room, 'guarded')) {
        // do not select the last room
        if(!checkLastRoom(room)) {
          return room;
        // except this is the only walkable
        } else if(sorted.length == 1) {
          return room;
        // or we are at withdraw
        } else if(creep.memory.status === 'atWithdrawal') {
          return room;
        }
      }
    });
  }
  // use our bases as option
  if(_.isEmpty(target)) {
    target = sorted.find(function(room){
      if(home.some((a) => a === room)) {
        // do not select the last room
        if(!checkLastRoom(room)) {
          return room;
        // except this is the only walkable
        } else if(sorted.length == 1) {
          return room;
        // or we are at withdraw
        } else if(creep.memory.status === 'atWithdrawal') {
          return room;
        }
      }
    });
  }
  // go back home as last option
  if(_.isEmpty(target)) {
    console.log('A Mangudai can not find an exit');
    creep.memory.status = 'onMarch';
    return;
  }

  // determine the concrete move

  // get identifier for exits
  let identifier = _.findKey(possible, (roomName) => roomName === target);

  // helper
  let byDirection = function(identifier) {
    let directions = {
      '1' : FIND_EXIT_TOP,
      '3' : FIND_EXIT_RIGHT,
      '5' : FIND_EXIT_BOTTOM,
      '7' : FIND_EXIT_LEFT
    }
    return directions[identifier];
  }

  // get all exitPositions of the selected exit
  let exitPositions = creep.room.find(byDirection(identifier));

  // closest exit
  let closestExitPos = creep.pos.findClosestByPath(exitPositions);

  let costMatrix = new PathFinder.CostMatrix();
  let roomName = creep.room.name;

  let search;
  // run shortest way
  if(creep.memory.status === 'atWithdrawal') {
    //TODO: Random exit position or nearest (nearest has to calculate before)
    search = creep.room.findPath(creep.pos, closestExitPos, {
      ignoreRoads : true,
      costCallback : function(roomName, costMatrix) {
        for (let x=0;x<50;x++) {
          for (let y=0;y<50;y++) {
            let cost;
            let terrain = Game.map.getTerrainAt(x,y,roomName);
            if (terrain == 'wall') {
                cost = 255;
            } else if (terrain == 'swamp') {
                cost = 1;
            } else {
                cost = 1;
            }
            costMatrix.set(x,y, cost);
          }
        }
      }
    });
  // run normal
  } else {
    search = creep.room.findPath(creep.pos, closestExitPos)
  }

  creep.memory.path = search;

  // and move it
  console.log('calc new path');
  creep.moveByPath(creep.memory.path);
};

let raid = function(flag, creep) {
  let report = { };
  // check for some creeps
  let hostileCreeps = creep.room.findEnemies();
  // no one here --> room is clean
  if(_.isEmpty(hostileCreeps)) {
    report[creep.room.name] = 'empty';
    creep.memory.history.unshift(report);

    return moveStrategic(flag, creep);
  }

  let mangudaiStrength = creep.getActiveBodyparts(RANGED_ATTACK) * 10;

  let soldiers = creep.room.find(hostileCreeps, {
    filter: (c) => {
      return ( (c.getActiveBodyparts(ATTACK) || c.getActiveBodyparts(RANGED_ATTACK))
        && flag.memory.victim.some((v) => v === c.owner.username))
    }
  });

  let enemiesStrength = 0;
  soldiers.forEach(function(soldier) {
    enemiesStrength += soldier.getActiveBodyparts(ATTACK) * 30;
    enemiesStrength += soldier.getActiveBodyparts(RANGED_ATTACK) * 10;
    enemiesStrength += soldier.getActiveBodyparts(HEAL) * 30;
  });

  if(enemiesStrength >= mangudaiStrength) {
    let report = { };
    report[creep.room.name] = 'guarded';
    creep.memory.history.unshift(report);

    creep.memory.status = 'atWithdrawal';
  } else {
    // select a weak soldier
    let target = creep.pos.findClosestByRange(soldiers);
    //TODO:add distance

    // then civilists
    if(_.isEmpty(target)) {
      let victims = creep.room.find(hostileCreeps, {
        filter: (c) => {
          return (flag.memory.victim.some((v) => v === c.owner.username))
        }
      });

      target = creep.pos.findClosestByRange(victims);
    }

    // attack the target
    if(!_.isEmpty(target)) {
      if(creep.pos.getRangeTo(target) > 2);
      creep.moveTo(target);
      creep.rangedAttack(target);
      //return creep.do('rangedAttack', target);
    }
    // no targts in this room, move to another
    else {
      let report = { };
      report[creep.room.name] = 'clean';
      creep.memory.history.unshift(report);

      return moveStrategic(flag, creep);
    }
  }

  // last action is attack
  if(!_.isEmpty(hostileCreeps)) {
    let targetEnemy = creep.pos.findInRange(hostileCreeps, 3)[0];

    creep.rangedAttack(targetEnemy);
  }
};