const Command = require('../../base/Command.js');
const cows = require('cows');

class Cow extends Command {
  constructor(client) {
    super(client, {
      name: 'cow',
      description: 'Send a random ascii image of a cow',
      usage: 'cow',
      category: 'Fun',
    });
  }

  async run(msg) {
    function randomInteger(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    return msg.channel.send(`\`\`\`${cows()[randomInteger(0, cows().length - 1)]}\`\`\``);
  }
}
module.exports = Cow;
