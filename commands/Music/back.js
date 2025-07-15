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
      return msg.channel.send('You must be in a voice channel to skip music.');
    }
    if (msg.guild.members.me.voice.channel && msg.member.voice.channel.id !== msg.guild.members.me.voice.channel.id) {
      return msg.channel.send('You must be in the same voice channel as the bot.');
    }
    if (!player || !player.playing) return msg.channel.send('There is nothing playing.');

    // Get previous track from history
    const previousTrack = await player.queue.shiftPrevious();
    if (!previousTrack) return msg.channel.send('There is no previous song in history.');

    await player.play({ clientTrack: previousTrack });

    const em = new EmbedBuilder()
      .setColor(msg.settings.embedSuccessColor)
      .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() })
      .addFields([{ name: 'Now Playing', value: previousTrack.info.title }]);

    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = Back;
