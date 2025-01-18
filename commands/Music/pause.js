const Command = require('../../base/Command.js');
const { useQueue } = require('discord-player');

class Pause extends Command {
  constructor(client) {
    super(client, {
      name: 'pause',
      description: 'Pauses the music',
      category: 'Music',
      usage: 'pause',
      guildOnly: true,
    });
  }

  async run(msg) {
    const queue = useQueue(msg.guild.id);

    if (!msg.member.voice.channel) return msg.channel.send('You must be in a voice channel to pause music.');
    if (msg.guild.members.me.voice.channel && msg.member.voice.channel.id !== msg.guild.members.me.voice.channel.id)
      return msg.channel.send('You must be in the same voice channel as the bot.');

    if (!queue || !queue.node) return msg.channel.send('No music is currently playing.');

    queue.node.setPaused(!queue.node.isPaused());
    return msg.channel.send(`Music has been ${queue.node.isPaused() ? 'paused' : 'resumed'}`);
  }
}

module.exports = Pause;
