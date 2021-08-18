const Command = require('../../base/Command.js');
const { getMember } = require('../../util/Util.js');

class wolfei extends Command {
  constructor (client) {
    super(client, {
      name: 'iwolfei',
      description: 'Say who the worst person in the world is.',
      category: 'Bot Admin',
      usage: 'iwolfei <user>',
      aliases: ['wolfei', 'iw'],
      guildOnly: true,
      permLevel: 'Bot Admin'
    });
  }

  async run (msg, text) {
    if (!text || text.length < 1) {
      return msg.channel.send(` Boo! ${msg.member} is the worst person in the world!`);
    }
    const mem = getMember(msg, text.join(' '));
    return msg.channel.send(`Boo! ${mem} is the worst person in the world!`);
  }
}

module.exports = wolfei;
