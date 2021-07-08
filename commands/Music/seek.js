const Command = require('../../base/Command.js');

class Seek extends Command {
  constructor (client) {
    super(client, {
      name: 'seek',
      description: 'Seek to a specific spot in the song.',
      category: 'Music',
      usage: 'seek <seconds>',
      guildOnly: true
    });
  }

  async run (msg, args) {
    if (!args || args.length < 1) return msg.channel.send(`Incorrect Usage: ${msg.settings.prefix}seek <seconds>`);
    if (!msg.member.voice.channel) return msg.channel.send('You must be in a voice channel to seek the music.');
    if (msg.guild.me.voice.channel && msg.member.voice.channel.id !== msg.guild.me.voice.channel.id) return msg.channel.send('You must be in the same voice channel as the bot.');
    if (!this.client.player.isPlaying(msg)) return msg.channel.send('There is nothing playing.');

    const num = parseInt(args[0] * 1000, 10);
    if (isNaN(num)) return msg.channel.send(`Incorrect Usage: ${msg.settings.prefix}seek <seconds>`);

    await this.client.player.seek(msg, num);
    const song = await this.client.player.nowPlaying(msg);

    return msg.channel.send(`Seeked to ${args[0]} second${args[0] > 1 ? 's' : ''} of ${song.title}.`);
  }
}

module.exports = Seek;
