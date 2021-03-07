const Command = require('../../base/Command.js');
const { clean, cleanString } = require('../../base/Util.js');
const cowsay = require('cowsay');

class Cowsay extends Command {
  constructor (client) {
    super(client, {
      name: 'cow-say',
      description: 'Say stuff as a cow.. moo.',
      usage: 'cow-say <text>',
      category: 'Fun',
      aliases: ['cowsay']
    });
  }

  async run (msg, args) {
    if (!args || args.length < 1) return msg.channel.send('Please type a message for me to say as a cow.');
    const text = args.join(' ');

    const cmsg = cowsay.say({
      text: await clean(this.client, cleanString(text))
    });

    return msg.channel.send(cmsg, { code: '' });
  }
}
module.exports = Cowsay;
