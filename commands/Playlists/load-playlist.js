const Command = require('../../base/Command.js');
const { stripIndents } = require('common-tags');
const { EmbedBuilder } = require('discord.js');
require('moment-duration-format');
const moment = require('moment');

class LoadPlaylist extends Command {
  constructor(client) {
    super(client, {
      name: 'load-playlist',
      description: 'Load the specified playlist into the queue',
      category: 'Playlists',
      usage: 'load-playlist <Playlist Name>',
      aliases: ['loadplaylist'],
      requiredArgs: 1,
      guildOnly: true,
    });
  }

  async run(msg, args) {
    const connection = await this.client.db.getConnection();
    const playlistName = args.join(' ').trim();

    if (playlistName.length === 0 || playlistName.length >= 50) {
      connection.release();
      return msg.channel.send('Please provide a valid playlist name (1-50 characters).');
    }

    const [playlistRows] = await connection.execute(
      /* sql */ `
        SELECT
          *
        FROM
          user_playlists
        WHERE
          user_id = ?
      `,
      [msg.author.id],
    );
    connection.release();

    let currentPlaylists = [];
    if (playlistRows.length) {
      currentPlaylists = JSON.parse(playlistRows[0].playlists);
    }

    // Find the playlist by name
    const userPlaylist = currentPlaylists.find((p) => p.name.toLowerCase() === playlistName.toLowerCase());

    if (!userPlaylist) {
      return this.client.util.errorEmbed(msg, 'You do not have a playlist with that name.');
    }

    if (!msg.member.voice?.channel) {
      return this.client.util.errorEmbed(msg, 'You must be in a voice channel to load a playlist.');
    }

    try {
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

      player.queue.add(userPlaylist.tracks);

      const tracksDuration = userPlaylist.tracks.reduce((acc, track) => acc + (track.info.duration || 0), 0);
      const totalDuration = moment
        .duration(tracksDuration)
        .format('y[ years][,] M[ Months][,] d[ days][,] h[ hours][,] m[ minutes][ and] s[ seconds]');

      const em = new EmbedBuilder()
        .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() })
        .setTitle('✅ Playlist Added to Queue')
        .setDescription(
          stripIndents`**${userPlaylist.tracks.length} tracks** from **${playlistName}** have been added to the queue

            **Total Duration:** ${totalDuration}
            **Queue Length:** ${player.queue.tracks.length} tracks`,
        )
        .setColor(msg.settings.embedColor)
        .setTimestamp();

      if (userPlaylist.tracks[0].info.artworkUrl) {
        em.setThumbnail(userPlaylist.tracks[0].info.artworkUrl);
      }

      if (!player.playing && !player.paused) {
        await player.play();
      }

      return msg.channel.send({ embeds: [em] });
    } catch (error) {
      console.error('Load Playlist Error:', error);
      return msg.channel.send(`An error occurred while loading the playlist: ${error.message}`);
    }
  }
}

module.exports = LoadPlaylist;
