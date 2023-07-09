const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { useHistory, useQueue } = require('discord-player');

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
    const history = useHistory(msg.guild.id);
    const queue = useQueue(msg.guild.id);

    if (!msg.member.voice.channel) return msg.channel.send('You must be in a voice channel to skip music.');
    if (msg.guild.members.me.voice.channel && msg.member.voice.channel.id !== msg.guild.members.me.voice.channel.id)
      return msg.channel.send('You must be in the same voice channel as the bot.');
    if (!queue.node.isPlaying()) return msg.channel.send('There is nothing playing.');

    await history.previous();
    const song = queue.currentTrack;

    const em = new EmbedBuilder()
      .setColor(msg.settings.embedSuccessColor)
      .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() })
      .addFields([{ name: 'Now Playing', value: song.title }]);

    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = Back;
