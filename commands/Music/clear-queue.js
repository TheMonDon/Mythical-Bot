const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

class ClearQueue extends Command {
  constructor(client) {
    super(client, {
      name: 'clear-queue',
      description: 'Clears all songs from the queue',
      category: 'Music',
      usage: 'clear-queue',
      aliases: ['cq', 'clearqueue', 'clear'],
      guildOnly: true,
    });
  }

  async run(msg) {
    const player = this.client.lavalink.getPlayer(msg.guild.id);

    if (!msg.member.voice.channel) {
      return this.client.util.errorEmbed(msg, 'You must be in a voice channel to clear the queue.');
    }
    if (msg.guild.members.me.voice.channel && msg.member.voice.channel.id !== msg.guild.members.me.voice.channel.id) {
      return this.client.util.errorEmbed(msg, 'You must be in the same voice channel as the bot.');
    }
    if (!player) {
      return this.client.util.errorEmbed(msg, 'There is nothing playing.');
    }

    player.queue.tracks.splice(0);

    const em = new EmbedBuilder()
      .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() })
      .setColor(msg.settings.embedSuccessColor)
      .setDescription(':recycle: The music queue has been cleared!');

    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = ClearQueue;
