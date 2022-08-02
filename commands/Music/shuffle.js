const Command = require('../../base/Command.js');

class Shuffle extends Command {
  constructor (client) {
    super(client, {
      name: 'shuffle',
      description: 'Shuffle the queue',
      category: 'Music',
      usage: 'shuffle',
      guildOnly: true
    });
  }

  async run (msg) {
    const queue = this.client.player.getQueue(msg.guild.id);

    if (!msg.member.voice.channel) return msg.channel.send('You must be in a voice channel to shuffle the queue.');
    if (msg.guild.members.me.voice.channel && msg.member.voice.channel.id !== msg.guild.members.me.voice.channel.id) return msg.channel.send('You must be in the same voice channel as the bot.');

    if (queue) {
      queue.shuffle();
      return msg.channel.send('The queue has been shuffled.');
    } else {
      return msg.channel.send('There is nothing in the queue.');
    }
  }
}

module.exports = Shuffle;
