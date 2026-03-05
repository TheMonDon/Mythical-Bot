const Command = require('../../base/Command.js');

class DeletePlaylist extends Command {
  constructor(client) {
    super(client, {
      name: 'delete-playlist',
      description: 'Deletes a saved playlist by name',
      category: 'Playlists',
      usage: 'delete-playlist <Playlist Name>',
      aliases: ['deleteplaylist'],
      requiredArgs: 1,
      guildOnly: true,
    });
  }

  async run(msg, args) {
    const playlistName = args.join(' ').trim();
    const connection = await this.client.db.getConnection();

    if (!playlistName) {
      connection.release();
      return this.client.util.errorEmbed(msg, 'Please specify the name of the playlist to delete.');
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

    let userPlaylists = [];
    if (playlistRows.length) {
      userPlaylists = JSON.parse(playlistRows[0].playlists);
    }

    if (!userPlaylists || userPlaylists.length === 0) {
      connection.release();
      return this.client.util.errorEmbed(msg, "You don't currently have any saved playlists.");
    }

    // Find the playlist by name
    const playlistIndex = userPlaylists.findIndex((p) => p.name.toLowerCase() === playlistName.toLowerCase());

    if (playlistIndex === -1) {
      connection.release();
      return this.client.util.errorEmbed(msg, `No playlist found with the name \`${playlistName}\`.`);
    }

    // Remove the playlist
    userPlaylists.splice(playlistIndex, 1);

    // Save the updated playlist array
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
      [msg.author.id, JSON.stringify(userPlaylists)],
    );
    connection.release();

    return msg.channel.send(`The playlist \`${playlistName}\` has been deleted.`);
  }
}

module.exports = DeletePlaylist;
