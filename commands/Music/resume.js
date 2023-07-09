const Command = require('../../base/Command.js');
const { useQueue } = require('discord-player');

class Resume extends Command {
  constructor(client) {
    super(client, {
      name: 'resume',
      description: 'Resumes the music',
      category: 'Music',
      usage: 'resume',
      guildOnly: true,
    });
  }

  async run(msg) {
    const queue = useQueue(msg.guild.id);

    if (!msg.member.voice.channel) return msg.channel.send('You must be in a voice channel to resume music.');
    if (msg.guild.members.me.voice.channel && msg.member.voice.channel.id !== msg.guild.members.me.voice.channel.id)
      return msg.channel.send('You must be in the same voice channel as the bot.');

    queue.node.setPaused(!queue.node.isPaused()); // isPaused() returns true if that player is already paused
    return msg.channel.send(`Music has been ${queue.node.isPaused() ? 'paused' : 'resumed'}`);
  }
}

module.exports = Resume;
