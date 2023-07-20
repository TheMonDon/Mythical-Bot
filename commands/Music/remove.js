const Command = require('../../base/Command.js');
const { useQueue } = require('discord-player');

class Remove extends Command {
  constructor(client) {
    super(client, {
      name: 'remove',
      description: 'Remove a track from the queue',
      category: 'Music',
      usage: 'remove <track number>',
      requiredArgs: 1,
      guildOnly: true,
    });
  }

  async run(msg, args) {
    const queue = useQueue(msg.guild.id);

    if (!msg.member.voice.channel) return msg.channel.send('You must be in a voice channel to modify the queue.');
    if (msg.guild.members.me.voice.channel && msg.member.voice.channel.id !== msg.guild.members.me.voice.channel.id)
      return msg.channel.send('You must be in the same voice channel as the bot.');
    if (!queue) return msg.channel.send('The queue is empty.');
    if (!queue.isPlaying()) return msg.channel.send('There is nothing playing.');

    const num = parseInt(args.join(' '), 10) - 1;
    if (isNaN(num)) return msg.channel.send('Please supply a valid number.');

    const ql = queue.tracks.size;
    if (num > ql) return msg.channel.send("You can't remove something that is not in the queue.");

    const tracks = queue.tracks.toArray();
    const song = tracks[num];
    queue.removeTrack(num);
    return msg.channel.send(`\`${song.title}\` has been removed from the queue.`);
  }
}

module.exports = Remove;
