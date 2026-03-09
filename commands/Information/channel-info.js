const { ChannelType, EmbedBuilder } = require('discord.js');
const Command = require('../../base/Command.js');

class ChannelInfo extends Command {
  constructor(client) {
    super(client, {
      name: 'channel-info',
      description: 'Gives some useful channel information',
      usage: 'channel-info [channel]',
      category: 'Information',
      aliases: ['ci', 'channelinfo'],
      guildOnly: true,
    });
  }

  async run(msg, args) {
    let infoChan = msg.channel;

    if (args?.length > 0) infoChan = this.client.util.getChannel(msg, args.join(' '));
    if (!infoChan) return msg.reply('That is not a valid channel.');

    const embed = new EmbedBuilder()
      .setTitle('Channel Information')
      .setColor(msg.settings.embedColor)
      .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() })
      .addFields([
        { name: 'Name', value: infoChan.name, inline: true },
        { name: 'ID', value: infoChan.id.toString(), inline: true },
        { name: 'Type', value: ChannelType[infoChan.type].toString(), inline: true },
        { name: 'Position', value: infoChan.position.toString(), inline: true },
      ]);

    if (infoChan.type === ChannelType.GuildText)
      embed.addFields([{ name: 'NSFW', value: infoChan.nsfw.toString(), inline: true }]);

    if (infoChan.type === ChannelType.GuildVoice || infoChan.type === ChannelType.GuildStageVoice) {
      embed.addFields([
        { name: 'User Limit', value: infoChan.userLimit.toString(), inline: true },
        { name: 'Bitrate', value: infoChan.bitrate.toString(), inline: true },
      ]);
    }

    if (infoChan.type === ChannelType.GuildCategory)
      embed.addFields([{ name: 'Children', value: infoChan.children.size.toString(), inline: true }]);

    const unix = Math.floor(infoChan.createdAt.getTime() / 1000);
    embed.addFields([
      { name: 'Mention', value: `\`${infoChan}\``, inline: true },
      {
        name: 'Created At',
        value: `<t:${unix}:F> \n(<t:${unix}:R>)`,
        inline: true,
      },
    ]);

    if (infoChan.parent)
      embed.addFields([{ name: 'Parent', value: `${infoChan.parent.name} \n\`${infoChan.parentId}\``, inline: true }]);

    if (infoChan.type === ChannelType.GuildText)
      embed.addFields([{ name: 'Topic', value: infoChan.topic || 'None', inline: false }]);

    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = ChannelInfo;
