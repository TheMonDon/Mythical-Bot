const Command = require('../../base/Command.js');
const { getMember } = require('../../util/Util.js');
const { EmbedBuilder } = require('discord.js');
delete require.cache[require.resolve('../../resources/messages/deaths.json')];
const deaths = require('../../resources/messages/deaths.json');

class Kill extends Command {
  constructor (client) {
    super(client, {
      name: 'kill',
      description: 'Kill the chosen user in a funny way.',
      usage: 'kill <user>',
      category: 'Fun',
      guildOnly: true
    });
  }

  async run (msg, text) {
    const member = msg.member;
    let mem;

    if (!text || text.length < 1) {
      return msg.channel.send(`Incorrect Usage: ${msg.settings.prefix}kill <user>`);
    } else {
      mem = getMember(msg, text.join(' '));
    }

    if (mem.id === msg.author.id) {
      return msg.channel.send('Please don\'t try to kill yourself :(');
    }

    const num = Math.round(Math.random() * (deaths.length - 1)) + 1;
    const embed = new EmbedBuilder()
      .setTitle(deaths[num].replace('{mem.displayName}', mem.displayName).replace('{member.displayName}', member.displayName))
      .setFooter({ text: `Reply #${num}` });
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = Kill;
