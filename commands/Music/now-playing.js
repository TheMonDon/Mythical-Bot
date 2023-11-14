const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { stripIndents } = require('common-tags');
const { useQueue } = require('discord-player');

class NowPlaying extends Command {
  constructor(client) {
    super(client, {
      name: 'now-playing',
      description: 'Shows what is currently playing',
      category: 'Music',
      usage: 'now-playing',
      aliases: ['np', 'nowplaying'],
      guildOnly: true,
    });
  }

  async run(msg) {
    const queue = useQueue(msg.guild.id);
    const song = queue?.currentTrack;

    if (!song) return msg.channel.send('There is nothing playing.');

    const em = new EmbedBuilder()
      .setDescription(
        stripIndents`
          Currently ${queue.node.isPlaying() ? 'Playing' : 'Paused'} ♪: [${song.title}](${song.url})

          ${queue.node.createProgressBar({ timecodes: true })}

          Requested By: ${song.requestedBy}
      `,
      )
      .setColor(msg.settings.embedColor)
      .setThumbnail(song.thumbnail)
      .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() });
    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = NowPlaying;
