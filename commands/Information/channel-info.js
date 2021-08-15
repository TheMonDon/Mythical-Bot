const Command = require('../../base/Command.js');
const { getChannel } = require('../../base/Util.js');
const DiscordJS = require('discord.js');
const moment = require('moment');
require('moment-duration-format');

class ChannelInfo extends Command {
  constructor (client) {
    super(client, {
      name: 'channel-info',
      description: 'Gives some useful channel information',
      usage: 'channel-info',
      category: 'Information',
      aliases: ['ci', 'channelinfo'],
      guildOnly: true
    });
  }

  async run (msg, text) {
    let infoChan = msg.channel;

    if (text && text.length > 0) infoChan = getChannel(msg, text.join(' '));

    const then = moment(infoChan.createdAt);
    const time = then.from(moment());
    const ca = then.format('MMM Do, YYYY');

    const embed = new DiscordJS.MessageEmbed()
      .setTitle('Channel Information')
      .setColor('RANDOM')
      .setAuthor(msg.author.username, msg.author.displayAvatarURL())
      .addField('Name', infoChan.name, true)
      .addField('ID', infoChan.id, true)
      .addField('Type', infoChan.type, true)
      .addField('Position', infoChan.position, true);
    if (infoChan.guild !== msg.guild) embed.addField('Server', infoChan.guild.name, true);
    if (infoChan.type === 'GUILD_TEXT') embed.addField('NSFW', infoChan.nsfw, true);
    if (infoChan.type === 'GUILD_VOICE') {
      embed.addField('User Limit', infoChan.userLimit, true);
      embed.addField('Bitrate', infoChan.bitrate, true);
    }
    if (infoChan.type === 'GUILD_CATEGORY') embed.addField('Children', infoChan.children.size, true);
    embed.addField('Mention', `\`${infoChan}\``, true);
    embed.addField('Created At', `${ca} \n (${time})`, true);
    if (infoChan.parent) embed.addField('Parent', `${infoChan.parent.name} \n \`${infoChan.parentID}\``, true);
    if (infoChan.type === 'text') embed.addField('Topic', `${(infoChan.topic) || 'None'}`, false);

    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = ChannelInfo;
