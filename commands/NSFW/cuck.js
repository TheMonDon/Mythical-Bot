const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const trev = require('trev');

class cuck extends Command {
  constructor (client) {
    super(client, {
      name: 'cuck',
      description: 'Sends a random image of some cuck.',
      usage: 'cuck',
      category: 'NSFW',
      nsfw: true
    });
  }

  async run (msg) {
    const cuck = await trev.nsfw.cuck();

    const em = new DiscordJS.MessageEmbed()
      .setTitle(cuck.title)
      .setURL(cuck.permalink)
      .setImage(cuck.media)
      .setFooter(msg.author.tag)
      .setTimestamp();
    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = cuck;
