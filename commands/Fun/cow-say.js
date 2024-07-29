const Command = require('../../base/Command.js');
const cowsay = require('cowsay');

class CowSay extends Command {
  constructor(client) {
    super(client, {
      name: 'cow-say',
      description: 'Say stuff as a cow.. moo',
      usage: 'cow-say <text>',
      category: 'Fun',
      aliases: ['cowsay'],
    });
  }

  async run(msg, args) {
    if (!args || args.length < 1) return msg.channel.send('Please type a message for me to say as a cow.');
    const text = args.join(' ');
    const lengthLimited = this.client.util.limitStringLength(text);

    const cowMessage = cowsay.say({
      text: await this.client.util.clean(this.client, lengthLimited),
    });

    return msg.channel.send(`\`\`\`${cowMessage}\`\`\``);
  }
}
module.exports = CowSay;
