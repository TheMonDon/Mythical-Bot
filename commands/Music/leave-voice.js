const Command = require('../../base/Command.js');

class LeaveVoice extends Command {
  constructor(client) {
    super(client, {
      name: 'leave-voice',
      description: 'Makes the bot leave the voice channel.',
      category: 'Music',
      usage: 'leave-voice',
      aliases: ['leavevoice', 'lv'],
      guildOnly: true,
    });
  }

  async run(msg) {
    if (!msg.member.voice.channel) return msg.channel.send('You must be in a voice channel to make the bot leave.');
    if (msg.guild.members.me.voice.channel && msg.member.voice.channel.id !== msg.guild.members.me.voice.channel.id)
      return msg.channel.send('You must be in the same voice channel as the bot.');

    return msg.guild.members.me.voice.disconnect();
  }
}

module.exports = LeaveVoice;
