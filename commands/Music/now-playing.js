const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { stripIndents } = require('common-tags');

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
    const player = this.client.lavalink.getPlayer(msg.guild.id);
    const song = player?.queue.current;

    if (!song) return msg.channel.send('There is nothing playing.');

    // Create a simple progress bar
    const position = player.position;
    const duration = song.info.duration;
    const progress = Math.round((position / duration) * 20);
    const progressBar = '▬'.repeat(progress) + '🔘' + '▬'.repeat(20 - progress);
    
    // Format time
    const formatTime = (ms) => {
      const minutes = Math.floor(ms / 60000);
      const seconds = Math.floor((ms % 60000) / 1000);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const em = new EmbedBuilder()
      .setDescription(
        stripIndents`
          Currently ${player.playing ? 'Playing' : 'Paused'} ♪: [${song.info.title}](${song.info.uri})

          ${progressBar} [${formatTime(position)}/${formatTime(duration)}]

          Requested By: ${song.requester}
      `,
      )
      .setColor(msg.settings.embedColor)
      .setThumbnail(song.info.artworkUrl)
      .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() });
    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = NowPlaying;
