const Node = require('class.node');

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
