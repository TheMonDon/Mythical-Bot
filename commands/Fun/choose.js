const Command = require('../../base/Command.js');
const { random } = require('../../base/Util.js');

class Choose extends Command {
  constructor (client) {
    super(client, {
      name: 'choose',
      description: 'Make the bot choose something.',
      usage: 'choose <thing 1, thing2, thing3>',
      category: 'Fun'
    });
  }

  async run (msg, text) {
    if (!text || text.length < 1) return msg.channel.send(`Incorrect Usage: ${msg.settings.prefix}choose (1 1, 2 2, 3 3) or (one two three)`);

    const join = text.join(' ');

    const args = /^(.+( ?, ?.+[^,])+)$/i.test(join) ? join.split(',') : join.split(' ');

    return msg.channel.send(`I choose: \`${random(args).trim()}\``);
  }
}
module.exports = Choose;
