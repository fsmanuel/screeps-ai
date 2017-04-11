const Logger = require('class.logger');
const Tree = require('class.tree');
const utilControl = require('util.control');

const {
  everyTicks,
  everyTicksFor
} = require('util.helpers');

const runOrder = {
  logistics: 1,
  lorry: 2
};

// Prio to runOrder roles
const sortByRunOrder = function(a, b) {
  let aCreep = runOrder[a.memory.role] || 10;
  let bCreep = runOrder[b.memory.role] || 10;

  return aCreep - bCreep;
};

module.exports = {
  buildTree() {
    let unresolvedNodes = [];

    // Root node
    let room = _
      .values(Game.rooms)
      .find((room) => {
        let flag = room.find(FIND_FLAGS, { filter: f => f.memory.controllerId })
        return _.isEmpty(flag) &&
          room.controller &&
          room.controller.my === true;
      });

    let tree = new Tree(room.controller.id);

    _
      .values(Game.rooms)
      .forEach((room) => {
        let flag = room.find(FIND_FLAGS, { filter: f => f.memory.controllerId })

        if (!_.isEmpty(flag)) {
          let id = flag[0].room.controller.id;
          let parentId = flag[0].memory.controllerId;

          let node = tree.add(id, parentId);

          if (!node) {
            // console.log(id, parentId);
            unresolvedNodes.push([id, parentId]);
          }
        }
      });

    // console.log(JSON.stringify(tree, tree._stringify));

    // console.log(unresolvedNodes);
    tree.resolve(unresolvedNodes);

    // console.log(JSON.stringify(tree, tree._stringify));

    this.tree = tree;
  },

  setup() {
    utilControl.config();

    // Convert flags to an array
    this.flagsToArray();

    // TODO: Find a way to run it everyTicks (we can not save it in memory!)
    this.updateClaims();

    // console.log(JSON.stringify(this.claims));

    this.updateFlags();

    this.buildTree();

    // If enemies are detected set flags
    // TODO: We can do it every 5 ticks
    everyTicks(2, () => this.setDefenseFlags());

    // Cleanup memory
    this.cleanup();

    // Room information
    _
      .values(Game.rooms)
      .forEach((room) => {
        everyTicks(150, () => {
          // Structural data
          room.updateStructuralData();
        });

        // Street maps
        room.drawStreetMap();

        // Lorries
        room.optimizeSourceContainers();
      });
  },

  // Spawn
  spawn() {
    // Collect creeps population governed by the controller aka census
    this.tree.invoke(function(node) {
      if (node.room.hasSpawns()) {
        node.controller.collectCreepsData();
      }
    }, this.tree.traverseDF);

    // TODO: Move into tree
    let claims = this.claims;
    let defendFlags = this.defendFlags;
    let attackFlags = this.attackFlags;

    // Then we autoSpawnCreeps
    this.tree.invoke(function(node) {
      // console.log(node.controller.id);

      node.controller.autoSpawnCreeps(
        claims,
        defendFlags,
        attackFlags
      );

      node.runJobCenter();
    }, this.tree.traverseDF);
  },

  run() {
    // We sort the creeps by role via runOrder
    _
      .values(Game.creeps)
      .sort(sortByRunOrder)
      // TODO: Check if we need the if
      .forEach(function(creep) {
        if (creep) {
          creep.run();
        }
      });
  },

  defense() {
    let colonys = this.empire();

    colonys.forEach(function(colony){
      let defcon = colony.defcon();

      if(colony.isStronghold()) {
        colony.upgradeDefense(defcon);
        colony.handleGates();
      }

      colony.stationaryFireControl(defcon);
    });
  },

  attack() {
    // Light Bowman

    this.attackFlags.forEach((flag) => {
      if(!flag.memory.setUp) {
        let lightBowmanFlags = this.attackFlags.filter((flag) => {
          flag.memory.tactic === 'offensiveArcher'
        });
        if(flag.memory.tactic === 'offensiveArcher' && !flag.memory.setUp) {
          // basic setup
          flag.memory = {
            tactic : 'offensiveArcher',
            order : lightBowmanFlags.length + 1,
            setUp : true,
            active : false,
            operate : false,
            targetFlagName : null,
            activeUnits : {
              lightBowman : []
            },
            requiredUnits : {
              lightBowman : 1
            }
          }
        }
      }
    });

    // Heavy Bowman

    this.attackFlags.forEach((flag) => {
      if(!flag.memory.setUp) {
        let heavyBowmanFlags = this.attackFlags.filter((flag) => {
          flag.memory.tactic === 'defensivArcher'
        });
        if(flag.memory.tactic === 'defensivArcher' && !flag.memory.setUp) {
          // basic setup
          flag.memory = {
            tactic : 'defensivArcher',
            order : heavyBowmanFlags.length + 1,
            setUp : true,
            active : false,
            operate : false,
            targetFlagName : null,
            activeUnits : {
              heavyBowman : []
            },
            requiredUnits : {
              heavyBowman : 1
            }
          }
        }
      }
    });

    // Manguadai

    const timeMangudai = _.random(1500, 2500);
    everyTicks(timeMangudai, function() {
      // Game.flags['mangudai_1'].memory.requiredUnits.mangudai = 1;
      // Game.flags['mangudai_2'].memory.requiredUnits.mangudai = 1;
    });

    this.attackFlags.forEach((flag) => {
      // Setup
      if(!flag.memory.setUp) {
        // Raid with Mangudai
        let raidFlags = this.attackFlags.filter((flag) => flag.memory.tactic === 'raid');
        if(flag.memory.tactic === 'raid' && !flag.memory.setUp) {
          // basic setup
          flag.memory = {
            tactic : 'raid',
            order : raidFlags.length,
            setUp : true,
            active : false,
            operate : false,
            targetFlagName : null,
            victim : ['gastraph'],
            activeUnits : {
              mangudai : []
            },
            requiredUnits : {
              mangudai : 1
            },
            operationalArea : {},
            history: []
          }
          // detailed setup
          if(flag.memory.order === 1) {
            flag.memory.operationalArea = {
              startBase : ['W83N6'],
              homeBases : ['W83N6', 'W83N9'],
              withdrawalRooms : ['W89N6', 'W86N6', 'W85N6', 'W84N6', 'W89N5', 'W88N5', 'W87N5',
               'W86N5', 'W85N5', 'W90N5', 'W90N6', 'W90N7', 'W90N8', 'W90N9', 'W90N10', 'W89N10',
               'W88N10', 'W87N10', 'W86N10', 'W85N10', 'W84N10', 'W83N10'],
              attackRooms : ['W88N9', 'W87N9', 'W85N9', 'W84N9', 'W89N8', 'W88N8', 'W87N8',
               'W86N8', 'W85N8', 'W89N7', 'W87N7', 'W86N7', 'W85N7', 'W87N6'],
              enemyBases : ['W89N9', 'W86N9', 'W88N7']
            }
          }
          if(flag.memory.order === 2) {
            flag.memory.operationalArea = {
              startBase : ['W83N6'],
              homeBases : ['W83N6', 'W83N9'],
              withdrawalRooms : ['W89N6', 'W86N6', 'W85N6', 'W84N6', 'W89N5', 'W88N5', 'W87N5',
               'W86N5', 'W85N5', 'W90N5', 'W90N6', 'W90N7', 'W90N8', 'W90N9', 'W90N10', 'W89N10',
               'W88N10', 'W87N10', 'W86N10', 'W85N10', 'W84N10', 'W83N10'],
              attackRooms : ['W88N9', 'W87N9', 'W85N9', 'W84N9', 'W89N8', 'W88N8', 'W87N8',
               'W86N8', 'W85N8', 'W89N7', 'W87N7', 'W86N7', 'W85N7', 'W87N6'],
              enemyBases : ['W89N9', 'W86N9', 'W88N7']
            }
          }
        }
      // Update Units
      } else {
        for(let type in flag.memory.activeUnits) {
            for(let u in type) {
                let creepName = flag.memory.activeUnits[type][u];
                if(!Game.creeps[creepName]) {
                    flag.memory.activeUnits[type].splice(u, 1);
                }
            }
        }
      }
    });

    // Crusade

    let crusadeFlag = Game.flags['crusade'];
    let crusadeWithdrawalFlag = Game.flags['crusadeWithdrawal'];

    if(crusadeFlag){
        if(!crusadeFlag.memory.setUp) {
            crusadeFlag.memory = {
                setUp : true,
                active : false,
                //goal : 'conquest',
                tactic : 'sabotageWithDeathblow',
                tacticalPhase : 1,
                tacticalWithdrawalTo : 'crusadeWithdrawal',
                //attackerRooms : ['W83N9', 'W83N8'],
                //supporterRooms : [],
                unitTypes : {
                    pawnSacrifice : [],
                    melee : []
                },
                pawnLimit : 4,
                meleeLimit : 4
            }
        } else {
            // update
            for(let type in crusadeFlag.memory.unitTypes) {
                for(let u in type) {
                    let creepName = crusadeFlag.memory.unitTypes[type][u];
                    if(!Game.creeps[creepName]) {
                        crusadeFlag.memory.unitTypes[type].splice(u, 1);
                    }
                }
            }
        }
    }

    // Destroyer

    let destroyFlag = Game.flags['destroy'];

    if(destroyFlag) {
      if(!destroyFlag.memory.setUp) {
        destroyFlag.memory =  {
          setUp : true,
          active : false,
          operate : false,
          tactic : 'destroy',
          tacticInfo : {
            targetType : 'ALL',
            radius : 0
          },
          activeUnits : {
            destroyer : []
          },
          requiredUnits : {
            destroyer : 1
          },
          requiredStrength : {
            destroyer : 'moderate' // low, moderate, high, ultra
          },
        }
      } else {
        // update
        for(let type in destroyFlag.memory.activeUnits) {
          for(let u in type) {
            let creepName = destroyFlag.memory.activeUnits[type][u];
            if(!Game.creeps[creepName]) {
                destroyFlag.memory.activeUnits[type].splice(u, 1);
            }
          }
        }
      }
    }
  },

  trade() {
    let colonys = this.empire();
    everyTicksFor(50, colonys, function(colonys) {

      colonys.forEach(function(colony){
        let terminal = colony.terminal;

        if(terminal) {
          colony.controller.trade();
        }
      });
    });
  },

  test() {
    let colonys = this.empire();
    everyTicksFor(1, colonys, function(colonys) {
      colonys.forEach(function(colony) {
        let observer = colony.find(FIND_MY_STRUCTURES, {
          filter: (s) => {
            return s.structureType === STRUCTURE_OBSERVER
          }
        })[0];

        if(observer) {
          let roomName = 'W84N1';
          observer.observeRoom(roomName);

          if(Game.rooms[roomName]) {
            let room = Game.rooms[roomName];

            //const USERNAME_WHITELIST = allies;
            let creeps = room.findEnemies();

            console.log(creeps);
          } else {
            console.log('Room is not visible');
          }
        }
      });
    });
  },

  // Helper
  flagsToArray() {
    this.flags = _.toArray(Game.flags);
  },

  updateFlags() {
    this.attackFlags = this.flags.filter((f) => {
      return f.color === COLOR_PURPLE && f.secondaryColor === COLOR_PURPLE;
    });
  },

  // Claims are represented by BLUE flags
  // Returns Array of Flag
  updateClaims() {
    this.claims = this.flags.filter(f => f.color === COLOR_BLUE);
  },

  // Defense are represented by RED flags
  setDefenseFlags() {
    this.claims.forEach((flag) => {
      // console.log(JSON.stringify(flag.room));
      if (flag.room) {
        flag.pos.setDefenseFlag();
      }
    });

    this.defendFlags = this.flags.filter((f) => {
      return f.color === COLOR_RED && f.secondaryColor === COLOR_RED;
    });
  },

  cleanup() {
    Object
      .keys(Memory.creeps)
      .forEach((creep) => {
        if (!Game.creeps[creep]) {
          delete Memory.creeps[creep];
          // Logger.log('Clearing non-existing creep memory:', creep);
        }
      });
  },

  empire() {
    return _.values(Game.rooms).filter(room => room.isColony());
  }
};
