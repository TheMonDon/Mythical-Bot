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

    if (!playlistName) {
      return this.client.util.errorEmbed(msg, 'Please specify the name of the playlist to delete.');
    }

    const [playlistRows] = await this.client.db.execute(
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
      return this.client.util.errorEmbed(msg, "You don't currently have any saved playlists.");
    }

    // Find the playlist by name
    const playlistIndex = userPlaylists.findIndex((p) => p.name.toLowerCase() === playlistName.toLowerCase());

    if (playlistIndex === -1) {
      return this.client.util.errorEmbed(msg, `No playlist found with the name \`${playlistName}\`.`);
    }

    // Remove the playlist
    userPlaylists.splice(playlistIndex, 1);

    // Save the updated playlist array
    await this.client.db.execute(
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

    return msg.channel.send(`The playlist \`${playlistName}\` has been deleted.`);
  }
}

module.exports = DeletePlaylist;
