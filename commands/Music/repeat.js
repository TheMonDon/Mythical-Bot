const Command = require('../../base/Command.js');

class Repeat extends Command {
  constructor(client) {
    super(client, {
      name: 'repeat',
      description: 'Repeats the current track, queue, or enables autoplay.',
      category: 'Music',
      usage: 'repeat <off | track | queue | autoplay>',
      guildOnly: true,
      aliases: ['loop'],
    });
  }

  async run(msg, args) {
    const queue = this.client.player.nodes.get(msg.guild.id);

    if (!msg.member.voice.channel) return msg.channel.send('You must be in a voice channel to loop music.');
    if (msg.guild.members.me.voice.channel && msg.member.voice.channel.id !== msg.guild.members.me.voice.channel.id)
      return msg.channel.send('You must be in the same voice channel as the bot.');
    if (!queue) return msg.channel.send('There is nothing in the queue.');

    const opts = ['off', 'track', 'queue', 'autoplay'];
    const text = args.join('').toLowerCase();
    if (!opts.includes(text))
      return msg.channel.send(`Incorrect Usage: ${msg.settings.prefix}repeat <off | track | queue | autoplay>`);

    const mode = opts.indexOf(text);
    if (mode === 0) {
      // Mode: off
      queue.setRepeatMode(0);
      return msg.channel.send('Stopped repeat mode.');
    } else if (mode === 1) {
      // Mode: Track
      queue.setRepeatMode(1);
      const song = queue.currentTrack;
      return msg.channel.send(`Now Repeating: ${song.title}`);
    } else if (mode === 2) {
      // Mode: Queue
      queue.setRepeatMode(2);
      return msg.channel.send('Now repeating whole queue.');
    } else {
      // Mode: Autoplay
      queue.setRepeatMode(3);
      return msg.channel.send('Turned on autoplay.');
    }
  }
}

module.exports = Repeat;
