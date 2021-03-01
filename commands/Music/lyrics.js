const Command = require('../../base/Command.js');
const lf = require('lyrics-finder');

class Lyrics extends Command {
  constructor (client) {
    super(client, {
      name: 'lyrics',
      description: 'Find the lyrics of a song',
      category: 'Music',
      usage: 'lyrics [song]'
    });
  }

  async run (msg, args) {
    let song;
    if (!args || args.length < 1) {
      if (!msg.guild) return msg.channel.send('I can\'t get the lyrics of nothing.');
      song = msg.client.player.getQueue(msg) && msg.client.player.getQueue(msg).playing.title;
      if (!song) return msg.channel.send('I can\'t get the lyrics of nothing.');
    } else {
      song = args.join(' ');
    }
    song = song.replace(/\(lyrics|lyric|official music video|audio|official|official video|official video hd|clip officiel|clip|extended|hq\)/g, '');
    const lyrics = await lf(song, '');
    if (!lyrics) return msg.channel.send(`No lyrics found for: ${song}`);

    return msg.channel.send(lyrics, { code: 'ascii', split: '\n' });
  }
}

module.exports = Lyrics;
