const Command = require('../../base/Command.js');
const cowsay = require('cowsay');

class Cowsay extends Command {
  constructor(client) {
    super(client, {
      name: 'cow-say',
      description: 'Say stuff as a cow.. moo.',
      usage: 'cow-say <text>',
      category: 'Fun',
      aliases: ['cowsay']
    });
  }

  async run(msg, args) {
    const text = args.join(' ');

    if (!args || args.length < 1) return msg.channel.send('Please type a message for me to say as a cow.');

    const text2 = text.replace(/@/g, '');

    const cmsg = cowsay.say({
      text: text2
    })

    if (cmsg.length + 6 > 2048) return msg.channel.send('The total message length I have to send is over 2048, try lowering the content length!');

    return msg.channel.send(`\`\`\`${cmsg}\`\`\``);
  }
}
module.exports = Cowsay;
