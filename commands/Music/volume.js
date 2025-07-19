const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

class Volume extends Command {
  constructor(client) {
    super(client, {
      name: 'volume',
      description: 'Change the volume of the music',
      category: 'Music',
      usage: 'volume <1-100>',
      aliases: ['vol', 'v'],
      guildOnly: true,
    });
  }

  async run(msg, args) {
    const player = this.client.lavalink.getPlayer(msg.guild.id);

    if (!msg.member.voice.channel) {
      return this.client.util.errorEmbed(msg, 'You must be in a voice channel to change the volume.');
    }
    if (msg.guild.members.me.voice.channel && msg.member.voice.channel.id !== msg.guild.members.me.voice.channel.id) {
      return this.client.util.errorEmbed(msg, 'You must be in the same voice channel as the bot to change the volume.');
    }
    if (!player || !player.playing) {
      return this.client.util.errorEmbed(msg, 'There is nothing playing.');
    }

    const volume = parseInt(args.join(' '), 10);

    if (!volume || isNaN(args[0]) || volume < 1 || volume > 100) {
      return this.client.util.errorEmbed(msg, 'Please enter a valid number between 1 and 100.');
    }

    await player.setVolume(volume);

    const em = new EmbedBuilder()
      .setColor(msg.settings.embedSuccessColor)
      .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() })
      .setDescription(`The volume has been set to: ${volume}`);

    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = Volume;
