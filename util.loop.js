const Logger = require('class.logger');
const Tree = require('class.tree');

const {
  everyTicks
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
        return _.isEmpty(flag) && room.controller.my === true;
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
        // room.optimizeSourceContainers();
      });

  },

  // Spawn
  spawn() {
    // Select all fully controlled rooms
    let controlledRooms = _
      .values(Game.rooms)
      .filter(room => room.controller.my == true)

    // Collect creeps population governed by the controller aka census
    this.tree.invoke(function(node) {
      node.controller().collectCreepsData();
    }, this.tree.traverseDF);

    // TODO: Move into tree
    let claims = this.claims;
    let defendFlags = this.defendFlags;
    let attackFlags = this.attackFlags;

    // Then we autoSpawnCreeps
    this.tree.invoke(function(node) {
      // console.log(node.controller().id);

      node.controller().autoSpawnCreeps(
        claims,
        defendFlags,
        attackFlags
      );
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

  defendAndRepair() {
    // Increase walls
    const time = 400;
    everyTicks(time, function() {
      _
        .toArray(Game.rooms)
        .forEach((room) => {
          // Set initial wall hits
          if (!room.memory.maxWallHits && room.isStronghold()) {
            room.memory.maxWallHits = 1000;
          }

          if (room.memory.maxWallHits < 4000000) {
              var oldLimit = room.memory.maxWallHits;
              const base = 1000;

              let walls = room.walls().length;

              // We increase the added value by controller level
              if (room.controller.level == 4) {
                  let value = Math.floor((time / 8) / walls) * base;

                  room.memory.maxWallHits += value;
              }
              else if (room.controller.level >= 5) {
                  let value = Math.floor((time / 4) / walls) * base;

                  room.memory.maxWallHits += value;
              } else {
                // Level 1 - 3
                room.memory.maxWallHits += base;
              }

              Logger.log(
                'Increased walls in', room.name,
                ' from', oldLimit,
                ' to:', room.memory.maxWallHits
              );
          }
        });
    });

    _
      .toArray(Game.structures)
      .filter(s => s.structureType === STRUCTURE_TOWER)
      .forEach((tower) => {
        // TODO: WAR - Add war mode aka factor = 1
        // TODO: If the energy level is too low set to 0.25 or 0 (collect from rooms)
        tower.defend()
      });
  },

  // Two flags are needed  (crusade and crusadeWithdrawal)
  attack() {
    let targetName = 'crusade';
    let withdrawalName = 'crusadeWithdrawal';

    let crusadeFlag = Game.flags[targetName];

    // tacticConfig = {
    //   sabotageWithDeathblow: {
    //     phase: 1,
    //     spawning: false,
    //     unitLimits: {
    //       monk: 4,
    //       melee: 4
    //     },
    //     unitTypes : {
    //       monk : [],
    //       melee : []
    //     },
    //
    //
    //   }
    // }
    // destroy = active : false, tactic : destroy, limit : 2, radius : 0, targetType : [ALL, HOSTILE]
    if (crusadeFlag) {
        if (!crusadeFlag.memory.setUp) {
            crusadeFlag.memory = {
                setUp : true,
                active : false,
                //goal : 'conquest',
                tactic : 'sabotageWithDeathblow',
                tacticalPhase : 1,
                tacticalWithdrawalTo : withdrawalName,
                //attackerRooms : ['W83N9', 'W83N8'],
                //supporterRooms : [],
                unitTypes : {
                    monk : [],
                    melee : []
                },
                monkLimit : 4,
                meleeLimit : 4
            }
        } else {
            // update
            for(let type in crusadeFlag.memory.unitTypes) {
                for(let u in type) {
                    let creepName = crusadeFlag.memory.unitTypes[type][u];
                    if (!Game.creeps[creepName]) {

                      // We need it for the migration
                      // if (type === 'monk') {
                      //   // delete crusadeFlag.memory.unitTypes[type]
                      //                         crusadeFlag.memory.unitTypes[type] = crusadeFlag.memory.unitTypes[type] || [];
                      // }

                        crusadeFlag.memory.unitTypes[type].splice(u, 1);
                    }
                }
            }
        }
    }
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
  }
};
