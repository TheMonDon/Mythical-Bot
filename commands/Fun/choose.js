const Command = require('../../base/Command.js');

class Choose extends Command {
  constructor(client) {
    super(client, {
      name: 'choose',
      description: 'Make the bot choose something.',
      usage: 'choose <one word, two words, ... | word1 word2 word3 ...>',
      requiredArgs: 2,
      category: 'Fun',
    });
  }

  async run(msg, text) {
    const join = text.join(' ');
    const args = /^(.+( ?, ?.+[^,])+)$/i.test(join) ? join.split(',') : join.split(' ');

    return msg.channel.send(`I choose: \`${this.client.util.random(args).trim()}\``);
  }
}
module.exports = Choose;
