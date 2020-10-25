const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const trev = require('trev');

class hentai extends Command {
  constructor (client) {
    super(client, {
      name: 'hentai',
      description: 'Sends a random image of some hentai.',
      usage: 'hentai',
      category: 'NSFW',
      nsfw: true
    });
  }

  async run (msg) {
    const hentai = await trev.nsfw.hentai();

    const em = new DiscordJS.MessageEmbed()
      .setTitle(hentai.title)
      .setURL(hentai.permalink)
      .setImage(hentai.media)
      .setFooter(msg.author.tag)
      .setTimestamp();
    return msg.channel.send(em);
  }
}

module.exports = hentai;