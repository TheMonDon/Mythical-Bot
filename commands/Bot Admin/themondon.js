const Command = require('../../base/Command.js');
const { getMember } = require('../../base/Util.js');

class themondon extends Command {
  constructor (client) {
    super(client, {
      name: 'themondon',
      description: 'Say who the best person in the world is.',
      category: 'Bot Admin',
      usage: 'themondon <user>',
      aliases: ['tmd', 'mon', 'don'],
      guildOnly: true,
      perms: 'Bot Admin'
    });
  }

  async run (msg, text) {
    if (!text || text.length < 1) {
      return msg.channel.send(` High Five! ${msg.member} is the best person in the world!`);
    }
    const mem = getMember(msg, text.join(' '));
    return msg.channel.send(`High Five! ${mem} is the best person in the world!`);
  }
}

module.exports = themondon;
