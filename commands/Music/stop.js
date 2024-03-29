const Command = require('../../base/Command.js');
const { useQueue } = require('discord-player');
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
    const queue = useQueue(msg.guild.id);

    if (!msg.member.voice.channel) return msg.channel.send('You must be in a voice channel to stop music.');
    if (msg.guild.members.me.voice.channel && msg.member.voice.channel.id !== msg.guild.members.me.voice.channel.id)
      return msg.channel.send('You must be in the same voice channel as the bot.');

    if (!queue) return msg.channel.send('There was nothing playing.');

    queue.delete();

    const em = new EmbedBuilder()
      .setColor(msg.settings.embedSuccessColor)
      .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() })
      .setDescription('All music has been stopped.');

    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = Stop;
