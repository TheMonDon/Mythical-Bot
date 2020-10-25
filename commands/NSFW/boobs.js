const Command = require('../../base/Command.js');
const DiscordJS = require('discord.js');
const trev = require('trev');

class boobs extends Command {
  constructor (client) {
    super(client, {
      name: 'boobs',
      description: 'Sends a random image of some boobs.',
      usage: 'boobs',
      category: 'NSFW',
      aliases: ['boobies', 'tits', 'titties'],
      nsfw: true
    });
  }

  async run (msg) {
    const boobs = await trev.nsfw.boobs();

    const em = new DiscordJS.MessageEmbed()
      .setTitle(boobs.title)
      .setURL(boobs.permalink)
      .setImage(boobs.media)
      .setFooter(msg.author.tag)
      .setTimestamp();
    return msg.channel.send(em);
  }
}

module.exports = boobs;
