const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

class Stop extends Command {
  constructor(client) {
    super(client, {
      name: 'stop',
      description: 'Stop playing amd clear the queue',
      category: 'Music',
      usage: 'stop',
      guildOnly: true,
    });
  }

  async run(msg) {
    const player = this.client.lavalink.getPlayer(msg.guild.id);

    if (!msg.member.voice.channel) {
      return this.client.util.errorEmbed(msg, 'You must be in a voice channel to stop music.');
    }
    if (msg.guild.members.me.voice.channel && msg.member.voice.channel.id !== msg.guild.members.me.voice.channel.id) {
      return this.client.util.errorEmbed(msg, 'You must be in the same voice channel as the bot.');
    }

    if (!player) {
      return this.client.util.errorEmbed(msg, 'There is nothing playing.');
    }

    await player.destroy();

    const em = new EmbedBuilder()
      .setColor(msg.settings.embedSuccessColor)
      .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() })
      .setDescription('All music has been stopped.');

    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = Stop;
