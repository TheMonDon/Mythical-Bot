const Command = require('../../base/Command.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

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

    const userPlaylists = (await db.get(`users.${msg.author.id}.playlists`)) || [];

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
    await db.set(`users.${msg.author.id}.playlists`, userPlaylists);

    return msg.channel.send(`The playlist \`${playlistName}\` has been deleted.`);
  }
}

module.exports = DeletePlaylist;
