const Command = require('../../base/Command.js');

class Seek extends Command {
  constructor (client) {
    super(client, {
      name: 'seek',
      description: 'Seek to a specific spot in the song.',
      category: 'Music',
      usage: 'seek <seconds>',
      guildOnly: true
    });
  }

  async run (msg, args) {
    const queue = this.client.player.getQueue(msg.guild);
    const usage = `Incorrect Usage: ${msg.settings.prefix}seek <seconds>`;

    if (!args || args.length < 1) return msg.reply(usage);
    if (!msg.member.voice.channel) return msg.channel.send('You must be in a voice channel to seek the music.');
    if (msg.guild.members.me.voice.channel && msg.member.voice.channel.id !== msg.guild.members.me.voice.channel.id) return msg.channel.send('You must be in the same voice channel as the bot.');
    if (!queue.nowPlaying()) return msg.channel.send('There is nothing playing.');

    const num = parseInt(args[0] * 1000, 10);
    if (isNaN(num)) return msg.reply(usage);

    await queue.seek(num);
    const song = queue.nowPlaying();

    return msg.channel.send(`Seeked to ${args[0]} second${args[0] > 1 ? 's' : ''} of ${song.title}.`);
  }
}

module.exports = Seek;
