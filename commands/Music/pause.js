const Command = require('../../base/Command.js');

class Pause extends Command {
  constructor (client) {
    super(client, {
      name: 'pause',
      description: 'Pauses the music',
      category: 'Music',
      usage: 'pause',
      guildOnly: true
    });
  }

  async run (msg) {
    if (!msg.member.voice.channel) return msg.channel.send('You must be in a voice channel to pause music.');
    if (msg.guild.me.voice.channel && msg.member.voice.channel.id !== msg.guild.me.voice.channel.id) return msg.channel.send('You must be in the same voice channel as the bot.');
    if (!this.client.player.isPlaying(msg)) return msg.channel.send('There is nothing playing.');
    const paused = await this.client.player.getQueue(msg).paused;

    if (!paused) {
      await this.client.player.pause(msg);
      return msg.channel.send('Music has been paused.');
    } else {
      await this.client.player.resume(msg);
      return msg.channel.send('Music has been resumed');
    }
  }
}

module.exports = Pause;
