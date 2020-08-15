const Command = require('../../base/Command.js');

class Pause extends Command {
  constructor (client) {
    super(client, {
      name: 'pause',
      description: 'Pauses msuic',
      category: 'Music',
      usage: 'pause',
      guildOnly: true
    });
  }

  async run (msg) {
    const client = this.client;

    if (!msg.member.voice.channel) return msg.channel.send('You must be in a voice channel to pause music');
    if (msg.guild.me.voice.channel && msg.member.voice.channel.id !== msg.guild.me.voice.channel.id) return msg.channel.send('You must be in the same voice channel as the bot');
    if (!client.player.isPlaying(msg.guild.id)) return msg.channel.send('There is nothing playing.');
    await client.player.pause(msg.guild.id);
    return msg.channel.send('Music has been paused.');
  }
}

module.exports = Pause;
