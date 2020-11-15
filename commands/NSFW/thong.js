const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const trev = require('trev');

class thong extends Command {
  constructor (client) {
    super(client, {
      name: 'thong',
      description: 'Sends a random image of some thong.',
      usage: 'thong',
      category: 'NSFW',
      nsfw: true
    });
  }

  async run (msg) {
    const thong = await trev.nsfw.thong();

    const em = new DiscordJS.MessageEmbed()
      .setTitle(thong.title)
      .setURL(thong.permalink)
      .setImage(thong.media)
      .setFooter(msg.author.tag)
      .setTimestamp();
    return msg.channel.send(em);
  }
}

module.exports = thong;
