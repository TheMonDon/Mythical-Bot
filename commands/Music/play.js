const Command = require('../../base/Command.js');
const db = require('quick.db');

class Play extends Command {
  constructor (client) {
    super(client, {
      name: 'play',
      description: 'Play music or add songs to the queue',
      longDescription: 'Supports youtube search/links, youtube playlist, and spotify playlists.',
      category: 'Music',
      usage: 'play <song>',
      aliases: ['p'],
      guildOnly: true
    });
  }

  async run (msg, args) {
    const client = this.client;
    if (!msg.member.voice.channel) return msg.channel.send('You must be in a voice channel to play music.');
    if (msg.guild.me.voice.channel && msg.member.voice.channel.id !== msg.guild.me.voice.channel.id) return msg.channel.send('You have to be in the same voice channel as the bot to play music');
  
    const query = args.join(' ');
    if (!query) return msg.channel.send('Please enter something to search for.');

    const matchSpotifyAlbumURL = query.match(/https?:\/\/(?:embed\.|open\.)(?:spotify\.com\/)(?:album\/|\?uri=spotify:album:)((\w|-){22})/);
    const matchSpotifyPlaylistURL = query.match(/https?:\/\/(?:embed\.|open\.)(?:spotify\.com\/)(?:playlist\/|\?uri=spotify:playlist:)((\w|-){22})/);

    if (matchSpotifyAlbumURL) {
      msg.channel.send('Converting album, this may take a few minutes.');
    } else if (matchSpotifyPlaylistURL) {
      msg.channel.send('Converting playlist, this may take a few minutes.');
    }

    const searchTracks = await client.player.searchTracks(query).catch(e => {
      console.log(e)
      return msg.channel.send('No results found.');
    });

    if (searchTracks.length < 1) return msg.channel.send('No results found.');

    if (client.player.isPlaying(msg.guild.id)) {
      // Iterate over all the tracks, add to queue
      for (let i = 0; i < searchTracks.length; i++) {
        await client.player.addToQueue(msg.guild.id, searchTracks[i], msg.member.user.tag);
      }
      msg.channel.send(`Added ${searchTracks.length > 1 ? `${searchTracks.length} songs` : searchTracks[0].name} to the queue.`);
    } else {
      // play once, add rest to queue
      const track = searchTracks[0];
      searchTracks.shift();
      const song = await client.player.play(msg.member.voice.channel, track, msg.member.user.tag);

      msg.channel.send(`Now Playing: ${song.name}`);
      for (let i = 0; i < searchTracks.length; i++) {
        await client.player.addToQueue(msg.guild.id, searchTracks[i], msg.member.user.tag);
      }
      
      client.player.getQueue(msg.guild.id).on('end', () => {
        msg.channel.send('Queue completed, add some more songs to play!');
      });

      client.player.getQueue(msg.guild.id).on('trackChanged', (oldSong, newSong, skipped, repeatMode) => {
        const am = db.get(`servers.${msg.guild.id}.music.announce`);
        if (repeatMode) {
          if (am) {
            return msg.channel.send(`Repeating: ${oldSong.name}`);
          } else {
            return;
          }
        } else {
          if (am) {
            return msg.channel.send(`Now Playing: ${newSong.name}`);
          } else {
            return;
          }
        }
      });
    }
  }
}

module.exports = Play;
