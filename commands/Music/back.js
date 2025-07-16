const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

class Back extends Command {
  constructor(client) {
    super(client, {
      name: 'back',
      description: 'Go back to the last song.',
      category: 'Music',
      usage: 'back',
      aliases: ['previous'],
      guildOnly: true,
    });
  }

  async run(msg) {
    const player = this.client.lavalink.getPlayer(msg.guild.id);

    if (!msg.member.voice.channel) {
      return this.client.util.errorEmbed(msg, 'You must be in a voice channel to go back to the previous song.');
    }
    if (msg.guild.members.me.voice.channel && msg.member.voice.channel.id !== msg.guild.members.me.voice.channel.id) {
      return this.client.util.errorEmbed(msg, 'You must be in the same voice channel as the bot.');
    }
    if (!player || !player.playing) {
      return this.client.util.errorEmbed(msg, 'There is nothing playing.');
    }

    // Get previous track from history
    const previousTrack = await player.queue.shiftPrevious();
    if (!previousTrack) {
      return this.client.util.errorEmbed(msg, 'There is no previous song in history.');
    }

    await player.play({ clientTrack: previousTrack });

    const em = new EmbedBuilder()
      .setColor(msg.settings.embedSuccessColor)
      .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() })
      .addFields([{ name: 'Now Playing', value: previousTrack.info.title }]);

    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = Back;
