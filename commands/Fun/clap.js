const Command = require('../../base/Command.js');

class Clap extends Command {
  constructor(client) {
    super(client, {
      name: 'clap',
      description: 'Clappify your text.',
      usage: 'clap <text>',
      category: 'Fun',
    });
  }

  async run(msg, args) {
    if (!args || args.length < 2) return msg.channel.send(`Incorrect Usage: ${msg.settings.prefix}Clap <text>`);
    const lengthLimited = this.client.util.limitStringLength(args.join(' ').replace(/\s/g, ' 👏 '));
    const clap = await this.client.util.clean(this.client, lengthLimited);

    return msg.channel.send(clap);
  }
}

module.exports = Clap;
