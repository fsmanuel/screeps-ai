module.exports = {
  config() {
    // TODO: Add your name
    global.ME = 'YOURNAME';
    global.allies = [global.me, 'pirx', 'fsmanuel'];

    const empire = {
      // TODO: Add your rooms
      // W82N3: {
      //   defense: {
      //     finalWallHits: 5000000,
      //     explorerEfficiency: 0.65
      //   }
      // },
    };

    for(let colony of Object.keys(empire)) {
      let options;
      options = _.assign({
        wallUpgradeTime: 400,
        finalWallHits: 1000000,
        wallContainer: true,
        explorerCount: 1,
        explorerEfficiency: 0.5,
      }, empire[colony].defense);
      Memory.rooms[colony].defense = Memory.rooms[colony].defense || options;

      options = _.assign({
        reserve: 300000,
        maxUpgraderCount: 3,
      }, empire[colony].economy);
      Memory.rooms[colony].economy = Memory.rooms[colony].economy || options;
    }
  }
}