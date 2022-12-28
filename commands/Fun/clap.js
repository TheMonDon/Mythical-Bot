const Command = require('../../base/Command.js');
const { clean, cleanString } = require('../../util/Util.js');

class Clap extends Command {
  constructor (client) {
    super(client, {
      name: 'clap',
      description: 'Clappify your text.',
      usage: 'clap <text>',
      category: 'Fun'
    });
  }

  async run (msg, args) {
    if (!args || args.length < 2) return msg.channel.send(`Incorrect Usage: ${msg.settings.prefix}Clap <text>`);
    const clap = await clean(this.client, cleanString(args.join(' ').replace(/\s/g, ' 👏 ')));

    return msg.channel.send(clap);
  }
}

module.exports = Clap;
