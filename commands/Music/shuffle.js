const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

class Shuffle extends Command {
  constructor(client) {
    super(client, {
      name: 'shuffle',
      description: 'Shuffle the queue',
      category: 'Music',
      usage: 'shuffle',
      guildOnly: true,
    });
  }

  async run(msg) {
    const player = this.client.lavalink.getPlayer(msg.guild.id);

    if (!msg.member.voice.channel) return msg.channel.send('You must be in a voice channel to shuffle the queue.');
    if (msg.guild.members.me.voice.channel && msg.member.voice.channel.id !== msg.guild.members.me.voice.channel.id) {
      return msg.channel.send('You must be in the same voice channel as the bot.');
    }

    if (!player || player.queue.tracks.length === 0) return msg.channel.send('There are no tracks in the queue.');

    await player.queue.shuffle();

    const em = new EmbedBuilder()
      .setColor(msg.settings.embedSuccessColor)
      .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() })
      .setDescription('The queue has been shuffled.');

    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = Shuffle;
