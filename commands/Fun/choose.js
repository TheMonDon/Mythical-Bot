const Command = require('../../base/Command.js');

class choose extends Command {
  constructor (client) {
    super(client, {
      name: 'choose',
      description: 'Make the bot choose something.',
      usage: 'choose <thing 1, thing2, thing3>',
      category: 'Fun'
    });
  }

  async run (msg, text) {
    const p = msg.settings.prefix;
    const join = text.join(' ');
    let args;

    if (!text || text.length < 1) {
      return msg.channel.send(`Incorrect Usage: ${p}choose (1 1, 2 2, 3 3) or (one two three)`);
    }

    if (/^(.+( ?\, ?.+[^,])+)$/i.test(join)) {
      args = join.split(',');
    } else {
      args = join.split(' ');
    }

    return msg.channel.send(`I choose: \`${args[Math.floor(Math.random() * args.length)].trim()}\``);
  }
}
module.exports = choose;
