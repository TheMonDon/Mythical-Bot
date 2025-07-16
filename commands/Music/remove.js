const Command = require('../../base/Command.js');

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
    const player = this.client.lavalink.getPlayer(msg.guild.id);

    if (!msg.member.voice.channel) {
      return this.client.util.errorEmbed(msg, 'You must be in a voice channel to remove a track from the queue.');
    }
    if (msg.guild.members.me.voice.channel && msg.member.voice.channel.id !== msg.guild.members.me.voice.channel.id) {
      return this.client.util.errorEmbed(msg, 'You must be in the same voice channel as the bot.');
    }
    if (!player) {
      return this.client.util.errorEmbed(msg, 'The queue is empty.');
    }
    if (!player.playing) {
      return this.client.util.errorEmbed(msg, 'There is nothing playing.');
    }

    const num = parseInt(args.join(' '), 10) - 1;
    if (isNaN(num)) {
      return this.client.util.errorEmbed(msg, 'Please supply a valid number.');
    }

    const ql = player.queue.tracks.length;
    if (num >= ql || num < 0) {
      return this.client.util.errorEmbed(msg, `Please supply a number between 1 and ${ql}.`);
    }

    const song = player.queue.tracks[num];
    await player.queue.remove(num);

    return msg.channel.send(`\`${song.info.title}\` has been removed from the queue.`);
  }
}

module.exports = Remove;
