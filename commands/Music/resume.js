const Command = require('../../base/Command.js');
const { useQueue } = require('discord-player');
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
    const queue = useQueue(msg.guild.id);

    if (!msg.member.voice.channel) return msg.channel.send('You must be in a voice channel to resume music.');
    if (msg.guild.members.me.voice.channel && msg.member.voice.channel.id !== msg.guild.members.me.voice.channel.id)
      return msg.channel.send('You must be in the same voice channel as the bot.');

    if (!queue || !queue.node) return msg.channel.send('No music is currently playing.');

    queue.node.setPaused(!queue.node.isPaused());

    const em = new EmbedBuilder()
      .setColor(msg.settings.embedSuccessColor)
      .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() })
      .setDescription(`Music has been ${queue.node.isPaused() ? 'paused' : 'resumed'}`);

    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = Resume;
