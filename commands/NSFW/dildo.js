const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const trev = require('trev');

class dildo extends Command {
  constructor (client) {
    super(client, {
      name: 'dildo',
      description: 'Sends a random image of some dildos.',
      usage: 'dildo',
      category: 'NSFW',
      aliases: ['silicone', 'vibrator', 'fake'],
      nsfw: true
    });
  }

  async run (msg) {
    const dildo = await trev.nsfw.dildo();

    const em = new DiscordJS.MessageEmbed()
      .setTitle(dildo.title)
      .setURL(dildo.permalink)
      .setImage(dildo.media)
      .setFooter(msg.author.tag)
      .setTimestamp();
    return msg.channel.send({embeds: [em]});
  }
}

module.exports = dildo;
