module.exports = {
  config() {
    global.ME = 'fsmanuel';
    global.allies = [global.me, 'pirx'];

    const empire = {
      W82N3: {
        defense: {
          finalWallHits: 5000000,
          explorerEfficiency: 0.65
        }
      },
      W82N4: {
        defense: {
          finalWallHits: 5000000,
          explorerEfficiency: 0.9
        }
      },
      W81N5: {
        defense: {
          finalWallHits: 5000000,
          explorerEfficiency: 0.9
        }
      },
      W83N2: {
        defense: {
          finalWallHits: 500000,
          explorerEfficiency: 0.6
        }
      }
    };

    for(let colony of Object.keys(empire)) {
      /* SETUP */
      let options;

      options = _.assign({
        wallUpgradeTime: 400,
        finalWallHits: 10000000,
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