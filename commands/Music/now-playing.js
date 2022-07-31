const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { stripIndents } = require('common-tags');

class NowPlaying extends Command {
  constructor (client) {
    super(client, {
      name: 'now-playing',
      description: 'Shows what is currently playing',
      category: 'Music',
      usage: 'now-playing',
      aliases: ['np', 'nowplaying'],
      guildOnly: true
    });
  }

  async run (msg) {
    const queue = this.client.player.getQueue(msg.guild);
    const song = queue.nowPlaying();
    if (!song) return msg.channel.send('There is nothing playing.');

    const em = new EmbedBuilder()
      .setDescription(stripIndents`
        Currently ${queue.playing ? 'Playing' : 'Paused'} ♪: [${song.title}](${song.url})

        ${queue.createProgressBar({ timecodes: true })}

        Requested By: ${song.requestedBy}
      `)
      .setColor('0099CC')
      .setThumbnail(song.thumbnail)
      .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() });
    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = NowPlaying;
