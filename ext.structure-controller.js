const Logger = require('class.logger');
const {
  everyTicks
} = require('util.helpers');

StructureController.prototype.autoSpawnCreeps = function(claimFlags, defendFlags, attackFlags) {
  let creep;
  let spawns = this.room.find(FIND_MY_SPAWNS);

  // console.log(this.spawning);
  for(let i in spawns) {
    let spawn = spawns[i];
    if (spawn.spawning) { continue; }

    if (!this.spawning) {
      creep = spawn.autoSpawnCreeps(claimFlags, defendFlags, attackFlags);

      if (creep) {
        this.spawning = true;
      }
      // console.log(creep);

      return creep;
    }
  }
};

/*
  Helpers
*/

// Creeps governed by the controller
StructureController.prototype.collectCreepsData = function() {
  // Get all creeps
  this.creeps = _.toArray(Game.creeps).filter(c => c.memory.controllerId === this.id);

  // Collect creeps statistics
  this.creepsCounts = this.creeps.reduce(function(data, creep) {
    let role = creep.memory.role;

    data[role] = data[role] ? data[role] + 1 : 1;
    return data;
  }, {});

  // Show population per spawn
  everyTicks(100, () => {
    Logger.log(this.room.name , JSON.stringify(this.creepsCounts));
  });
};

StructureController.prototype.claims = function() {
  return this.room.find(FIND_FLAGS, {
    filter: (flag) => {
        return flag.memory.controllerId === this.id &&
            flag.room.controller.level === 0;
    }
  });
};

// Market System

StructureController.prototype.trade = function() {
  let roomName = this.room.name;
  let roomMineralType = this.room.mineral().mineralType;

  let tradeVolume = 10000;

  // SELL roomMinerals if the terminal gets to full
  if(_.sum(this.room.terminal.store) >= 290000) {
    // get all BUY orders from the market
    let rawOrders = Game.market.getAllOrders({
      type : ORDER_BUY,
      resourceType : roomMineralType
    });

    // calculate real price
    let orders = rawOrders.map(function(order){
      let transactionCost = Game.market.calcTransactionCost(1, roomName, order.roomName);

      order['transactionCost'] = transactionCost;
      order['total'] = _.round(order.price / transactionCost, 3);

      return order
    });

    // sort them by real price
    let sorted = orders.sort(function (a, b) {
      return b.total - a.total
    });

    let bestOffer = sorted[0];

    // sell the minerals
    let amount = tradeVolume;
    if(bestOffer.amount < amount) { amount = bestOffer.amount; }
    let response = Game.market.deal(bestOffer.id, amount, roomName);

    if(response === OK) {
      Logger.log(
        'DEAL! for', bestOffer.total,
        'with', bestOffer.roomName,
        'type', roomMineralType,
        'amount', amount
      );
    } else {
      Logger.log(
        'no deal for', roomMineralType,
        'because of', response
      );
    }
  }
};