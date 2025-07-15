const Command = require('../../base/Command.js');
const { QuickDB } = require('quick.db');
const { v4: uuidv4 } = require('uuid');
const db = new QuickDB();

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

    if (!player || player.queue.tracks.length < 1) {
      return msg.channel.send('There are no tracks in the queue to save to a playlist.');
    }

    const playlistName = args.join(' ').trim();

    if (playlistName.length === 0 || playlistName.length >= 50) {
      return msg.channel.send('Please provide a valid playlist name (1-50 characters).');
    }

    const currentPlaylists = (await db.get(`users.${msg.author.id}.playlists`)) || [];

    if (currentPlaylists.some((p) => p.name === playlistName)) {
      return msg.channel.send('You already have a playlist with that name.');
    }

    if (currentPlaylists.length >= 50) {
      return msg.channel.send('You have reached the maximum number of playlists allowed (50).');
    }

    const queue = await player.queue.QueueSaver.get(msg.guild.id);

    const newPlaylist = {
      id: uuidv4(),
      name: playlistName,
      createdAt: new Date().toISOString(),
      tracks: queue.tracks,
    };

    try {
      await db.push(`users.${msg.author.id}.playlists`, newPlaylist);
      return msg.channel.send(
        `I have successfully created the playlist \`${playlistName}\` with ${
          queue.tracks.length
        } tracks. You can play it using the \`load-playlist\` command. (${currentPlaylists.length + 1}/50)`,
      );
    } catch (error) {
      console.error(error);
      return msg.channel.send('An error occurred while saving your playlist.');
    }
  }
}

module.exports = SavePlaylist;
