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

    await this.client.player.play(msg, query, true);
  }
}

module.exports = Play;
