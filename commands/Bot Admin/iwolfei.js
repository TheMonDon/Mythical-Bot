const Command = require('../../base/Command.js');

class wolfei extends Command {
  constructor (client) {
    super(client, {
      name: 'iwolfei',
      description: 'Say who the worst person in the world is.',
      category: 'Bot Admin',
      usage: 'iwolfei <user>',
      aliases: ['wolfei', 'iw'],
      guildOnly: true,
      perms: 'Bot Admin'
    });
  }

  async run (msg, text) {
    if (!text || text.length < 1) {
      return msg.channel.send(` Boo! ${msg.member} is the worst person in the world!`);
    }
    let info_mem;
    const server = msg.guild;
    if (text[0]) {
      info_mem = msg.mentions.members.first() || server.members.cache.find(m => m.id === `${text[0]}`) || server.members.cache.find(m => m.displayName.toUpperCase() === `${text[0].toUpperCase()}`) || server.members.cache.find(m => m.user.username.toUpperCase() === `${text[0].toUpperCase()}`) || server.members.cache.find(m => m.user.username.toLowerCase()
        .includes(`${text[0].toLowerCase()}`));
    }
    return msg.channel.send(`Boo! ${info_mem} is the worst person in the world!`);
  }
}

module.exports = wolfei;
