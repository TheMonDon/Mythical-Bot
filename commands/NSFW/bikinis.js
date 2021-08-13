const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const trev = require('trev');

class bikinis extends Command {
  constructor (client) {
    super(client, {
      name: 'bikinis',
      description: 'Sends a random image of some bikinis.',
      usage: 'bikinis',
      category: 'NSFW',
      nsfw: true
    });
  }

  async run (msg) {
    const bikinis = await trev.nsfw.bikinis();

    const em = new DiscordJS.MessageEmbed()
      .setTitle(bikinis.title)
      .setURL(bikinis.permalink)
      .setImage(bikinis.media)
      .setFooter(msg.author.tag)
      .setTimestamp();
    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = bikinis;
