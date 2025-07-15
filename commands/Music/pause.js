const Command = require('../../base/Command.js');

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
    const player = this.client.lavalink.getPlayer(msg.guild.id);

    if (!msg.member.voice.channel) return msg.channel.send('You must be in a voice channel to pause music.');
    if (msg.guild.members.me.voice.channel && msg.member.voice.channel.id !== msg.guild.members.me.voice.channel.id)
      return msg.channel.send('You must be in the same voice channel as the bot.');

    if (!player || !player.queue.current) return msg.channel.send('No music is currently playing.');

    await player.pause(!player.paused);
    return msg.channel.send(`Music has been ${player.paused ? 'paused' : 'resumed'}`);
  }
}

module.exports = Pause;
