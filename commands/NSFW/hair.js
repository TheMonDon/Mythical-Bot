const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const trev = require('trev');

class hair extends Command {
  constructor (client) {
    super(client, {
      name: 'hair',
      description: 'Sends a random image of some hair.',
      usage: 'hair',
      category: 'NSFW',
      nsfw: true
    });
  }

  async run (msg) {
    const hair = await trev.nsfw.hair();

    const em = new DiscordJS.MessageEmbed()
      .setTitle(hair.title)
      .setURL(hair.permalink)
      .setImage(hair.media)
      .setFooter(msg.author.tag)
      .setTimestamp();
    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = hair;
