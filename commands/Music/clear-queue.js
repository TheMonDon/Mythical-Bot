const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

class ClearQueue extends Command {
  constructor (client) {
    super(client, {
      name: 'clear-queue',
      description: 'Clears all songs from the queue',
      category: 'Music',
      usage: 'clear-queue',
      aliases: ['cq', 'clearqueue', 'clear'],
      guildOnly: true
    });
  }

  async run (msg) {
    const queue = this.client.player.nodes.get(msg.guild.id);

    if (!msg.member.voice.channel) return msg.channel.send('You must be in a voice channel to clear the queue.');
    if (msg.guild.members.me.voice.channel && msg.member.voice.channel.id !== msg.guild.members.me.voice.channel.id) return msg.channel.send('You must be in the same voice channel as the bot.');
    if (!queue) return msg.channel.send('There is nothing in the queue.');

    queue.delete(false);

    const em = new EmbedBuilder()
      .setDescription(':recycle: The music queue has been cleared!');
    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = ClearQueue;
