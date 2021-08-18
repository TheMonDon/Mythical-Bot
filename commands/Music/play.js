const Command = require('../../base/Command.js');

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
    if (!msg.member.voice.channel) return msg.channel.send('You must be in a voice channel to play music.');
    if (msg.guild.me.voice.channel && msg.member.voice.channel.id !== msg.guild.me.voice.channel.id) return msg.channel.send('You have to be in the same voice channel as the bot to play music');

    const query = args.join(' ').slice(0, 300);
    if (!query) return msg.channel.send('Please enter something to search for.');

    const queue = await this.client.player.createQueue(msg.guild, { metadata: msg });
    const song = await this.client.player.search(query, { requestedBy: msg.author });

    try {
      await queue.connect(msg.member.voice.channel);
    } catch {
      msg.reply('Could not join your voice channel.');
    }

    if (song.tracks.length > 1) {
      queue.addTracks(song.tracks);
    } else {
      queue.addTrack(song.tracks[0]);
    }
    queue.play();
  }
}

module.exports = Play;
