const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

class Resume extends Command {
  constructor(client) {
    super(client, {
      name: 'resume',
      description: 'Resumes the music',
      category: 'Music',
      usage: 'resume',
      guildOnly: true,
    });
  }

  async run(msg) {
    const player = this.client.lavalink.getPlayer(msg.guild.id);

    if (!msg.member.voice.channel) {
      return this.client.util.errorEmbed(msg, 'You must be in a voice channel to resume music.');
    }
    if (msg.guild.members.me.voice.channel && msg.member.voice.channel.id !== msg.guild.members.me.voice.channel.id) {
      return this.client.util.errorEmbed(msg, 'You must be in the same voice channel as the bot.');
    }
    if (!player || !player.queue.current) {
      return this.client.util.errorEmbed(msg, 'There is no music currently playing.');
    }
    if (!player.paused) {
      return this.client.util.errorEmbed(msg, 'The music is already playing.');
    }

    await player.resume();

    const em = new EmbedBuilder()
      .setColor(msg.settings.embedSuccessColor)
      .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() })
      .setDescription('▶️ Music has been resumed.');

    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = Resume;
