const Command = require('../../base/Command.js');
const { v4: uuidv4 } = require('uuid');

class SavePlaylist extends Command {
  constructor(client) {
    super(client, {
      name: 'save-playlist',
      description: 'Saves the current queue into your own playlist',
      category: 'Playlists',
      usage: 'save-playlist <Playlist Name>',
      aliases: ['saveplaylist'],
      requiredArgs: 1,
      guildOnly: true,
    });
  }

  async run(msg, args) {
    const player = this.client.lavalink.getPlayer(msg.guild.id);
    const connection = await this.client.db.getConnection();

    if (!player || player.queue.tracks.length < 1) {
      connection.release();
      return this.client.util.errorEmbed(msg, 'There are no tracks in the queue to save to a playlist.');
    }

    const playlistName = args.join(' ').trim();

    if (playlistName.length === 0 || playlistName.length >= 50) {
      connection.release();
      return this.client.util.errorEmbed(msg, 'Please provide a valid playlist name (1-50 characters).');
    }

    if (!/^[a-zA-Z0-9 ]+$/.test(playlistName)) {
      connection.release();
      return this.client.util.errorEmbed(msg, 'Playlist names can only contain letters, numbers, and spaces.');
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

    let currentPlaylists = [];
    if (playlistRows.length) {
      currentPlaylists = JSON.parse(playlistRows[0].playlists);
    }

    if (currentPlaylists.some((p) => p.name === playlistName)) {
      connection.release();
      return this.client.util.errorEmbed(msg, 'You already have a playlist with that name.');
    }

    if (currentPlaylists.length >= 20) {
      connection.release();
      return this.client.util.errorEmbed(msg, 'You have reached the maximum number of playlists allowed (20).');
    }

    const newPlaylist = {
      id: uuidv4(),
      name: playlistName,
      createdAt: new Date().toISOString(),
      tracks: player.queue.tracks,
    };

    try {
      currentPlaylists.push(newPlaylist);
      await connection.execute(
        /* sql */
        `
          INSERT INTO
            user_playlists (user_id, playlists)
          VALUES
            (?, ?) ON DUPLICATE KEY
          UPDATE playlists =
          VALUES
            (playlists)
        `,
        [msg.author.id, JSON.stringify(currentPlaylists)],
      );

      connection.release();
      return msg.channel.send(
        `I have successfully created the playlist \`${playlistName}\` with ${player.queue.tracks.length} tracks. You can play it using the \`load-playlist\` command. (${currentPlaylists.length}/50)`,
      );
    } catch (error) {
      connection.release();

      console.error('Save Playlist Error:', error);
      return msg.channel.send(`An error occurred while saving your playlist: ${error.message}`);
    }
  }
}

module.exports = SavePlaylist;
