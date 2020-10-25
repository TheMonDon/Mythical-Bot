const Command = require('../../base/Command.js');

class clap extends Command {
  constructor(client) {
    super(client, {
      name: 'clap',
      description: 'Clappify your text.',
      usage: 'clap <text>',
      category: 'Fun',
      aliases: []
    });
  }

  async run(msg, args) {
    const clapify = args.join(' ');

    if (!args || args.length < 2) return msg.channel.send(`Incorrect Usage: ${p}Clap <text>`);

    const clap = clapify.replace(/\s/g, ' 👏 ').replace(/@/g, '')

    if (clap.length > 2000) return msg.channel.send(`Your message is too long. Please keep it under 2000 characters. (${clap.length}/2000)`);
    msg.channel.send(clap)
  }
}
module.exports = clap;
