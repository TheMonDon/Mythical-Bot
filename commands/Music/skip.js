const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

class Skip extends Command {
  constructor(client) {
    super(client, {
      name: 'skip',
      description: 'Skip the current song',
      category: 'Music',
      usage: 'skip',
      aliases: ['next'],
      guildOnly: true,
    });
  }

  async run(msg) {
    const queue = useQueue(msg.guild.id);

    if (!msg.member.voice.channel) return msg.channel.send('You must be in a voice channel to skip music.');
    if (msg.guild.members.me.voice.channel && msg.member.voice.channel.id !== msg.guild.members.me.voice.channel.id)
      return msg.channel.send('You must be in the same voice channel as the bot.');
    if (!queue) return msg.channel.send('There is nothing playing.');

    const song = queue.currentTrack;
    queue.node.skip();

    const em = new EmbedBuilder()
      .setColor(msg.settings.embedSuccessColor)
      .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() });
    if (song) em.addFields([{ name: 'Skipped Song', value: song.title, inline: false }]);

    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = Skip;
