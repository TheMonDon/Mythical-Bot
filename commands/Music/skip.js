const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');

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
    const player = this.client.lavalink.getPlayer(msg.guild.id);

    if (!msg.member.voice.channel) {
      return this.client.util.errorEmbed(msg, 'You must be in a voice channel to skip music.');
    }
    if (msg.guild.members.me.voice.channel && msg.member.voice.channel.id !== msg.guild.members.me.voice.channel.id) {
      return this.client.util.errorEmbed(msg, 'You must be in the same voice channel as the bot.');
    }
    if (!player || !player.queue.current) {
      return this.client.util.errorEmbed(msg, 'There is nothing playing.');
    }
    if (player.queue.tracks.length < 1) {
      return this.client.util.errorEmbed(msg, 'There are no more songs in the queue.');
    }

    const song = player.queue.current;
    await player.skip();

    const em = new EmbedBuilder()
      .setColor(msg.settings.embedSuccessColor)
      .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() });
    if (song) em.addFields([{ name: 'Skipped Song', value: song.info.title, inline: false }]);

    return msg.channel.send({ embeds: [em] });
  }
}

module.exports = Skip;
