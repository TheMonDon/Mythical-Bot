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
    if (!msg.member.voice.channel) return msg.channel.send('You must be in a voice channel to modify the queue.');
    if (msg.guild.me.voice.channel && msg.member.voice.channel.id !== msg.guild.me.voice.channel.id) return msg.channel.send('You must be in the same voice channel as the bot.');
    if (!this.client.player.isPlaying(msg)) return msg.channel.send('There is nothing playing.');

    if (!args || args.length < 1) return msg.channel.send('Incorrect usage: remove <Queue Track Number>');

    const num = parseInt(args.join(' '), 10) - 1;
    if (isNaN(num)) return msg.channel.send('Please supply a valid number.');

    const ql = this.client.player.getQueue(msg).tracks.length;
    const queue = this.client.player.getQueue(msg);
    if (num > ql) return msg.channel.send('You can\'t remove something that is not in the queue.');

    const song = queue.tracks[num] && queue.tracks[num].title;
    this.client.player.remove(msg, num);
    return msg.channel.send(`Removed song: ${song} from the queue.`);
  }
}

module.exports = Remove;
