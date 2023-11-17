const Command = require('../../base/Command.js');
const { useQueue } = require('discord-player');
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
    const queue = useQueue(msg.guild.id);

    if (!msg.member.voice.channel) return msg.channel.send('You must be in a voice channel to shuffle the queue.');
    if (msg.guild.members.me.voice.channel && msg.member.voice.channel.id !== msg.guild.members.me.voice.channel.id)
      return msg.channel.send('You must be in the same voice channel as the bot.');

    if (!queue) return msg.channel.send('There is nothing in the queue.');

    queue.tracks.shuffle();

    const em = new EmbedBuilder()
      .setColor(msg.settings.embedSuccessColor)
      .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() })
      .setDescription('The queue has been shuffled.');

    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = Shuffle;
