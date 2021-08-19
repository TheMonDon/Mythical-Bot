const Command = require('../../base/Command.js');

class Remove extends Command {
  constructor (client) {
    super(client, {
      name: 'remove',
      description: 'Remove a track from the queue',
      category: 'Music',
      usage: 'remove <#>',
      guildOnly: true
    });
  }

  async run (msg, args) {
    const queue = this.client.player.getQueue(msg.guild);

    if (!msg.member.voice.channel) return msg.channel.send('You must be in a voice channel to modify the queue.');
    if (msg.guild.me.voice.channel && msg.member.voice.channel.id !== msg.guild.me.voice.channel.id) return msg.channel.send('You must be in the same voice channel as the bot.');
    if (!queue) return msg.channel.send('The queue is empty.');
    if (!queue.nowPlaying()) return msg.channel.send('There is nothing playing.');

    if (!args || args.length < 1) return msg.channel.send('Incorrect usage: remove <Queue Track Number>');

    const num = parseInt(args.join(' '), 10) - 1;
    if (isNaN(num)) return msg.channel.send('Please supply a valid number.');

    const ql = queue.tracks.length;
    if (num > ql) return msg.channel.send('You can\'t remove something that is not in the queue.');

    const song = queue.tracks[num];
    queue.remove(song);
    return msg.channel.send(`Removed song: ${song.title} from the queue.`);
  }
}

module.exports = Remove;
