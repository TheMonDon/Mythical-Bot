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
    const queue = this.client.player.getQueue(msg.guild);

    if (!msg.member.voice.channel) return msg.channel.send('You must be in a voice channel to pause music.');
    if (msg.guild.members.me.voice.channel && msg.member.voice.channel.id !== msg.guild.members.me.voice.channel.id) return msg.channel.send('You must be in the same voice channel as the bot.');
    if (!queue.playing) return msg.channel.send('There is nothing playing.');

    if (queue.playing) {
      queue.setPaused(true);
      return msg.channel.send('Music has been paused.');
    } else {
      queue.setPaused(false);
      return msg.channel.send('Music has been resumed');
    }
  }
}

module.exports = Pause;
