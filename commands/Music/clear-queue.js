const Command = require('../../base/Command.js');
const { MessageEmbed } = require('discord.js');

class ClearQueue extends Command {
  constructor (client) {
    super(client, {
      name: 'clear-queue',
      description: 'Clears all songs from the queue',
      category: 'Music',
      usage: 'clear-queue',
      aliases: ['cq', 'clearqueue'],
      guildOnly: true
    });
  }

  async run (msg) {
    if (!msg.member.voice.channel) return msg.channel.send('You must be in a voice channel to clear the queue.');
    if (msg.guild.me.voice.channel && msg.member.voice.channel.id !== msg.guild.me.voice.channel.id) return msg.channel.send('You must be in the same voice channel as the bot.');
    if (!this.client.player.isPlaying(msg.guild.id)) return msg.channel.send('There is nothing playing.');
    this.client.player.clearQueue(msg.guild.id);
    const em = new MessageEmbed()
      .setDescription(':recycle: The music queue has been cleared!');
    msg.channel.send(em);
  }
}

module.exports = ClearQueue;
