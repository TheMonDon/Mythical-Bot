const Command = require('../../base/Command.js');
const lf = require('lyrics-finder');

class Lyrics extends Command {
  constructor (client) {
    super(client, {
      name: 'lyrics',
      description: 'Find the lyrics of a song',
      category: 'Music',
      usage: 'lyrics [optional song]',
      guildOnly: true
    });
  }

  async run (msg, args) {
    let song;
    if (!args || args.length < 1) {
      song = msg.client.player.getQueue(msg.guild.id) && msg.client.player.getQueue(msg.guild.id).playing.name;
      if (!song) return msg.channel.send('I can\'t get the lyrics of nothing.');
    } else {
      song = args.join(' ');
    }
    const lyrics = await lf(song, '');
    if (!lyrics) return msg.channel.send(`No lyrics found for: ${song}`);

    msg.channel.send(lyrics, { code: 'ascii', split: '\n'});

  }
}

module.exports = Lyrics;
