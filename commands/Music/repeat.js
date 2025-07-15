const Command = require('../../base/Command.js');

class Repeat extends Command {
  constructor(client) {
    super(client, {
      name: 'repeat',
      description: 'Repeats the current track or queue.',
      category: 'Music',
      usage: 'repeat <off | track | queue>',
      guildOnly: true,
      requiredArgs: 1,
      aliases: ['loop'],
    });
  }

  async run(msg, args) {
    const player = this.client.lavalink.getPlayer(msg.guild.id);

    if (!msg.member.voice.channel) return msg.channel.send('You must be in a voice channel to loop music.');
    if (msg.guild.members.me.voice.channel && msg.member.voice.channel.id !== msg.guild.members.me.voice.channel.id) {
      return msg.channel.send('You must be in the same voice channel as the bot.');
    }
    if (!player) return msg.channel.send('There is nothing currently playing.');

    const opts = ['off', 'track', 'queue'];
    const text = args.join('').toLowerCase();
    if (!opts.includes(text)) {
      return this.client.util.errorEmbed(msg, msg.settings.prefix + this.help.usage, 'Incorrect Usage');
    }

    const mode = opts.indexOf(text);

    if (mode === 0) {
      if (player.repeatMode === 'off') {
        return msg.channel.send('There is nothing currently repeating.');
      }

      player.setRepeatMode('off');
      return msg.channel.send('Stopped repeat mode.');
    } else if (mode === 1) {
      const song = player.queue.current;

      if (player.repeatMode === 'track') {
        return msg.channel.send(`The song \`${song.info.title}\` is already repeating.`);
      }

      player.setRepeatMode('track');
      return msg.channel.send(`Now Repeating: \`${song.info.title}\``);
    } else if (mode === 2) {
      if (player.repeatMode === 'queue') {
        return msg.channel.send('The queue is already repeating.');
      }

      player.setRepeatMode('queue');
      return msg.channel.send('Now repeating whole queue.');
    }
  }
}

module.exports = Repeat;
