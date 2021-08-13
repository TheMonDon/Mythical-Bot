const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const trev = require('trev');

class gonewild extends Command {
  constructor (client) {
    super(client, {
      name: 'gonewild',
      description: 'Sends a random image of some gonewild.',
      usage: 'gonewild',
      category: 'NSFW',
      nsfw: true
    });
  }

  async run (msg) {
    const gonewild = await trev.nsfw.gonewild();

    const em = new DiscordJS.MessageEmbed()
      .setTitle(gonewild.title)
      .setURL(gonewild.permalink)
      .setImage(gonewild.media)
      .setFooter(msg.author.tag)
      .setTimestamp();
    return msg.channel.send({embeds: [em]});
  }
}

module.exports = gonewild;
