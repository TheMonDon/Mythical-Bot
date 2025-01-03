const Command = require('../../base/Command.js');

class Clap extends Command {
  constructor(client) {
    super(client, {
      name: 'clap',
      description: 'Clapify your text',
      usage: 'clap <text>',
      examples: ['clap add emojis to this'],
      category: 'Fun',
      requiredArgs: 2,
    });
  }

  async run(msg, args) {
    const lengthLimited = this.client.util.limitStringLength(args.join(' ').replace(/\s/g, ' 👏 '));
    const clap = await this.client.util.clean(this.client, lengthLimited);

    return msg.channel.send(clap);
  }
}

module.exports = Clap;
