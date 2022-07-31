const Command = require('../../base/Command.js');

class Stop extends Command {
  constructor (client) {
    super(client, {
      name: 'stop',
      description: 'Stops the music',
      category: 'Music',
      usage: 'stop',
      guildOnly: true
    });
  }

  async run (msg) {
    const queue = this.client.player.getQueue(msg.guild.id);

    if (!msg.member.voice.channel) return msg.channel.send('You must be in a voice channel to stop music.');
    if (msg.guild.members.me.voice.channel && msg.member.voice.channel.id !== msg.guild.members.me.voice.channel.id) return msg.channel.send('You must be in the same voice channel as the bot.');

    if (queue) {
      queue.destroy();
      return msg.channel.send('Music has been stopped.');
    } else {
      return msg.channel.send('There was nothing playing.');
    }
  }
}

module.exports = Stop;
