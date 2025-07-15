const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

class Play extends Command {
  constructor(client) {
    super(client, {
      name: 'play',
      description: 'Play music or add songs to the queue',
      longDescription: 'Supports youtube search/links, youtube playlist, and spotify playlists.',
      category: 'Music',
      usage: 'play <song>',
      aliases: ['p'],
      examples: ['play unsweetened lemonade'],
      requiredArgs: 1,
      guildOnly: true,
    });
  }

  async run(msg, args) {
    if (!msg.member.voice.channel) return msg.channel.send('You must be in a voice channel to play music.');
    if (msg.guild.members.me.voice.channel && msg.member.voice.channel.id !== msg.guild.members.me.voice.channel.id)
      return msg.channel.send('You have to be in the same voice channel as the bot to play music');

    // Check if any Lavalink nodes are available
    if (!this.client.lavalink.nodeManager.nodes.size) {
      return msg.channel.send('No Lavalink nodes are available. Please try again later.');
    }

    const query = args.join(' ').slice(0, 300);

    try {
      // Get or create player
      let player = this.client.lavalink.getPlayer(msg.guild.id);

      if (!player) {
        player = this.client.lavalink.createPlayer({
          guildId: msg.guild.id,
          voiceChannelId: msg.member.voice.channel.id,
          textChannelId: msg.channel.id,
          selfDeaf: true,
          selfMute: false,
        });
      }

      if (!player.connected) {
        await player.connect();
      }

      // Search for tracks
      const result = await player.search(
        {
          query,
          source: 'ytsearch',
        },
        msg.author,
      );

      if (!result || !result.tracks || result.tracks.length === 0) {
        return msg.channel.send('No tracks found.');
      }

      // Add track(s) to queue
      if (result.loadType === 'playlist') {
        await player.queue.add(result.tracks);
        const totalDuration = result.tracks.reduce((acc, track) => acc + (track.info.duration || 0), 0);
        const durationStr = totalDuration
          ? `\`${Math.floor(totalDuration / 60000)}:${String(Math.floor((totalDuration % 60000) / 1000)).padStart(
              2,
              '0',
            )}\``
          : '`Unknown`';

        const em = new EmbedBuilder()
          .setTitle('✅ Playlist Added to Queue')
          .setDescription(
            `**${result.tracks.length} tracks** from **${
              result.playlist?.name || 'Unknown Playlist'
            }** have been added\n\n` +
              `**Total Duration:** ${durationStr}\n` +
              `**Requested By:** ${msg.author}\n` +
              `**Queue Length:** ${player.queue.tracks.length} tracks`,
          )
          .setColor(msg.settings.embedColor)
          .setTimestamp();

        if (result.tracks[0].info.artworkUrl) {
          em.setThumbnail(result.tracks[0].info.artworkUrl);
        }

        msg.channel.send({ embeds: [em] });
      } else {
        await player.queue.add(result.tracks[0]);

        if (player.playing) {
          const queuePosition = player.queue.tracks.length;
          const duration = result.tracks[0].info.duration
            ? `\`${Math.floor(result.tracks[0].info.duration / 60000)}:${String(
                Math.floor((result.tracks[0].info.duration % 60000) / 1000),
              ).padStart(2, '0')}\``
            : '`Unknown`';
          const calculateEstimatedTime = player.queue.tracks.reduce(
            (acc, track) => acc + (track.info.duration || 0),
            0,
          );
          const em = new EmbedBuilder()
            .setTitle('✅ Track Added to Queue')
            .setDescription(
              `**[${result.tracks[0].info.title}](${result.tracks[0].info.uri})**\n\n` +
                `**Duration:** ${duration}\n` +
                `**Requested By:** ${msg.author}\n` +
                `**Queue Position:** ${queuePosition}\n` +
                `**Estimated Time Until Playing:** \`${Math.floor(calculateEstimatedTime / 60000)}:${String(
                  Math.floor((calculateEstimatedTime % 60000) / 1000),
                ).padStart(2, '0')}\``,
            )
            .setColor(msg.settings.embedColor)
            .setTimestamp();

          if (result.tracks[0].info.artworkUrl) {
            em.setThumbnail(result.tracks[0].info.artworkUrl);
          }

          msg.channel.send({ embeds: [em] });
        }
      }

      // Start playing if not already playing
      if (!player.playing && !player.paused) {
        await player.play();
      }
    } catch (e) {
      console.error('Play command error:', e);
      return msg.channel.send(`Something went wrong: \`${e.message || e}\``);
    }
  }
}

module.exports = Play;
