const JobCenter = require('class.job-center');
const MilitaryAdministration = require('class.military-administration');
const MiningAdministration = require('class.mining-administration');

class Node {
  constructor(id, data = {}) {
    this.id = id;
    this.data = data;
    this.children = [];
    this.parent = null;

    this._cache = new Map;
  }

  get controller() {
    return Game.getObjectById(this.id);
  }

  get room() {
    return this.controller.room;
  }

  get creeps() {
    // TODO: Figure out how we can cache it
    // if (this._creeps) { return this._creeps; }

    this._creeps = _
      .toArray(Game.creeps)
      .filter(creep => creep.memory.controllerId === this.id);

    return this._creeps;
  }

  // Job center
  get jobCenter() {
    return this.fromCache('job-center');
  }

  runJobCenter() {
    if (!this.room.hasSpawns()) { return; }

    this.jobCenter.run();
  }

  // Military administration
  get militaryAdministration() {
    return this.fromCache('military-administration');
  }

  // TODO: move defendFlag logic in here and save the flagName in cache
  defendFlag() {
    return this.room.find(FIND_FLAGS, {
      filter: f => f.color === COLOR_RED && f.secondaryColor === COLOR_RED
    })[0];
  }

  // Mining administration
  get miningAdministration() {
    return this.fromCache('mining-administration');
  }

  fromCache(key) {
    let cache = this._cache;
    if (cache.has(key)) { return cache.get(key); }

    let instance;

    switch (key) {
      case 'job-center':
        instance = new JobCenter(this);
        break;
      case 'military-administration':
        instance = new MilitaryAdministration(this);
        break;
      case 'mining-administration':
        instance = new MiningAdministration(this);
        break;
      default:
        console.log('Class not found', key);
    }

    // console.log(key);
    cache.set(key, instance);

    return instance;
  }

  debug() {
    console.log(JSON.stringify.apply(this, ...arguments));
  }
}

// https://code.tutsplus.com/articles/data-structures-with-javascript-tree--cms-23393
module.exports = class Tree {
  constructor(id, data = {}) {
    this._root = new Node(id, data);
  }

  add(id, parentId, data = {}, traversal) {
    traversal = traversal || this.traverseBF;

    let child = new Node(id, data);
    let parent = null;

    this.contains(function(node) {
      if (node.id === parentId) { parent = node; }
    }, traversal);

    if (parent) {
      parent.children.push(child);
      child.parent = parent;
      return child;
    }
  }

  traverseDF(callback) {
    // this is a recurse and immediately-invoking function
    (function recurse(currentNode) {
      // step 2
      for (var i = 0, length = currentNode.children.length; i < length; i++) {
        // step 3
        recurse(currentNode.children[i]);
      }

      // step 4
      callback(currentNode);

      // step 1
    })(this._root);
  }

  traverseBF(callback) {
    let queue = [];

    queue.push(this._root);
    let currentTree = queue.shift();

    while(currentTree){
      for (var i = 0, length = currentTree.children.length; i < length; i++) {
        queue.push(currentTree.children[i]);
      }

      callback(currentTree);
      currentTree = queue.shift();
    }
  }

  contains(callback, traversal) {
    traversal.call(this, callback);
  }

  invoke(callback, traversal) {
    traversal.call(this, callback);
  }

  // Max depth of 2!!!! No infinit loop
  resolve(unresolvedNodes, depth = 3) {
    if (depth <= 0) { return; }
    depth -= 1;

    unresolvedNodes.forEach((data, index) => {
      let node = this.add(data[0], data[1]);
      if (node) { unresolvedNodes.splice(index, 1); }
    });

    if (!_.isEmpty(unresolvedNodes)) {
      this.resolve(unresolvedNodes, depth);
    }
  }

  // Prevent circular refs for JSON.stringify
  _stringify(key, value) {
    if (key === 'parent' && value) { return value.id; }
    return value;
  }
}
