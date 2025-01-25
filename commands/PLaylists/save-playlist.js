const { serialize, useQueue } = require('discord-player');
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
    const queue = useQueue(msg.guild.id);

    if (!queue || !queue.node) {
      return msg.channel.send('No music is currently playing.');
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

    const serializedTracks = queue.tracks.map((track) => serialize(track));

    if (serializedTracks.length === 0) {
      return msg.channel.send('The queue is empty, nothing to save.');
    }

    const newPlaylist = {
      id: uuidv4(),
      name: playlistName,
      createdAt: new Date().toISOString(),
      tracks: serializedTracks,
    };

    try {
      await db.push(`users.${msg.author.id}.playlists`, newPlaylist);
      return msg.channel.send(
        `I have successfully created the playlist \`${playlistName}\` with ${
          serializedTracks.length
        } tracks. You can play it using the \`load-playlist\` command. (${currentPlaylists.length + 1}/50)`,
      );
    } catch (error) {
      console.error(error);
      return msg.channel.send('An error occurred while saving your playlist.');
    }
  }
}

module.exports = SavePlaylist;
