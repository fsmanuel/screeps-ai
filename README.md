# screeps-ai

## Setup

## How to play

There are a couple of rules:

- You have to set all construction sites
- You can place flags to control the creeps
  - BLUE flags are for reserving a room and mining it
  - BLUE / GREEN flags are for claiming (the claimer will switch from reserveController -> claimController)
http://support.screeps.com/hc/en-us/articles/203084991-API-Reference
https://www.youtube.com/watch?v=prmhEdyFK1A

### TODO
#### Defence

- Gather inside of walls if enemy creeps in room

```
// Look for old containers that are flagged to dismantle (BROWN)
let flag = this.pos.findClosestFlag(COLOR_BROWN);

if (flag) {
  let target = _.find(
    flag.pos.lookFor(LOOK_STRUCTURES),
    s => [STRUCTURE_WALL, STRUCTURE_RAMPART].includes(s.structureType)
  )

  if (target) {
    return this.do('dismantle', target);
  }
}
```