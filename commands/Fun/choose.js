const Command = require('../../base/Command.js');

class Choose extends Command {
  constructor(client) {
    super(client, {
      name: 'choose',
      description: 'Make the bot choose something',
      usage: 'choose <choice 1, choice 2...>',
      examples: ['choose Minecraft Terraria', 'choose Minecraft, Terraria'],
      requiredArgs: 2,
      category: 'Fun',
    });
  }

  async run(msg, args) {
    const join = args.join(' ');
    const text = /^(.+( ?, ?.+[^,])+)$/i.test(join) ? join.split(',') : join.split(' ');
    const cleanedRandom = await this.client.util.clean(this.client, this.client.util.random(text).trim());

    return msg.channel.send(`I choose: \`${cleanedRandom}\``);
  }
}
module.exports = Choose;
