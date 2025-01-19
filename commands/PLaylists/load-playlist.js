const { deserialize, useMainPlayer } = require('discord-player');
const Command = require('../../base/Command.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

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
    const player = useMainPlayer();

    const playlistName = args.join(' ').trim();

    if (playlistName.length === 0 || playlistName.length >= 50) {
      return msg.channel.send('Please provide a valid playlist name (1-50 characters).');
    }

    const currentPlaylists = (await db.get(`users.${msg.author.id}.playlists`)) || [];

    // Find the playlist by name
    const userPlaylist = currentPlaylists.find((p) => p.name.toLowerCase() === playlistName.toLowerCase());

    if (!userPlaylist) {
      return msg.channel.send("You don't have a playlist with that name.");
    }

    const playlist = player.createPlaylist({
      author: {
        name: msg.author.tag,
        url: '',
      },
      description: '',
      id: userPlaylist.id,
      source: 'arbitrary',
      thumbnail: '',
      title: playlistName,
      tracks: [],
      type: 'playlist',
      url: '',
    });

    try {
      const tracks = userPlaylist.tracks.map((track) => {
        const song = deserialize(player, track);
        song.playlist = playlist;
        return song;
      });

      playlist.tracks = tracks;

      await player.play(msg.member.voice.channel, playlist, {
        requestedBy: msg.author,
        nodeOptions: {
          metadata: msg,
          selfDead: true,
          leaveOnStop: true,
          leaveOnEnd: false,
          leaveOnEmpty: false,
        },
      });

      return msg.channel.send(`Your playlist \`${playlistName}\` has been loaded!`);
    } catch (error) {
      console.error('Deserialization error:', error);
      msg.channel.send('An error occurred while loading the queue.');
    }
  }
}

module.exports = LoadPlaylist;
