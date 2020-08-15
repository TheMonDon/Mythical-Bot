const Command = require('../../base/Command.js');

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
    let info_mem;
    const server = msg.guild;
    if (text[0]) {
      info_mem = msg.mentions.members.first() || server.members.cache.find(m => m.id === `${text[0]}`) || server.members.cache.find(m => m.displayName.toUpperCase() === `${text[0].toUpperCase()}`) || server.members.cache.find(m => m.user.username.toUpperCase() === `${text[0].toUpperCase()}`) || server.members.cache.find(m => m.user.username.toLowerCase()
        .includes(`${text[0].toLowerCase()}`));
    }
    return msg.channel.send(`High Five! ${info_mem} is the best person in the world!`);
  }
}

module.exports = themondon;
