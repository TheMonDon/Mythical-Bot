const Command = require('../../base/Command.js');
const { useQueue } = require('discord-player');

class Volume extends Command {
  constructor(client) {
    super(client, {
      name: 'volume',
      description: 'Change the volume of the music',
      category: 'Music',
      usage: 'volume <1-100>',
      aliases: ['vol', 'v'],
      guildOnly: true,
    });
  }

  async run(msg, args) {
    const queue = useQueue(msg.guild.id);

    if (!msg.member.voice.channel) return msg.channel.send('You must be in a voice channel to change the volume.');
    if (msg.guild.members.me.voice.channel && msg.member.voice.channel.id !== msg.guild.members.me.voice.channel.id)
      return msg.channel.send('You must be in the same voice channel as the bot.');
    if (!queue.node.isPlaying()) return msg.channel.send('There is nothing playing.');

    const volume = parseInt(args.join(' '), 10);

    if (!volume) return msg.channel.send('Please enter a valid number.');
    if (isNaN(args[0])) return msg.channel.send('Please enter a valid number.');
    if (volume < 1 || volume > 100) return msg.channel.send('The volume must be between 1 and 100.');
    queue.node.setVolume(volume);

    return msg.channel.send(`The volume has been set to: ${volume}`);
  }
}

module.exports = Volume;
