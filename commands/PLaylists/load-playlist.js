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

    if (!msg.member.voice?.channel) {
      return msg.channel.send('You must be in a voice channel to use this command.');
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

        await player.connect();
      }

      player.queue.add(userPlaylist.tracks);

      if (!player.playing && !player.paused) {
        await player.play();
      }

      return msg.channel.send(`Your playlist \`${playlistName}\` has been loaded!`);
    } catch (error) {
      console.error('Load Playlist Error:', error);
      msg.channel.send('An error occurred while loading the queue.');
    }
  }
}

module.exports = LoadPlaylist;
