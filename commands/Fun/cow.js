const Command = require('../../base/Command.js');
const cows = require('cows');
const rn = require('random-number');

class cow extends Command {
  constructor(client) {
    super(client, {
      name: 'cow',
      description: 'Send a random ascii image of a cow.',
      usage: 'cow',
      category: 'Fun',
      aliases: []
    });
  }

  async run(msg) {
    const options = {
        min: 0,
        max: cows().length - 1,
        integer: true
    }
    const random = rn(options);
    return msg.channel.send(cows()[random], { code: ''})
  }
}
module.exports = cow;
