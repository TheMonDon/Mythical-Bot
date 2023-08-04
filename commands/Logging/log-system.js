const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

class logSystem extends Command {
  constructor(client) {
    super(client, {
      name: 'log-system',
      description: 'See information about the log system',
      usage: 'Log-System',
      category: 'Logging',
      permLevel: 'Moderator',
      aliases: ['logsystem'],
      guildOnly: true,
    });
  }

  async run(msg) {
    if (!(await db.get(`servers.${msg.guild.id}.logs.channel`)))
      return msg.channel.send(`The log system is not set up! Use \`${msg.settings.prefix}Setup Logging <Channel>\``);

    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedColor)
      .addFields([
        {
          name: 'Toggle Status',
          value: `
**Bulk Messages Deleted:** ${(await db.get(`servers.${msg.guild.id}.logs.logSystem.bulk-messages-deleted`)) || ':x:'}
**Channel Created:** ${(await db.get(`servers.${msg.guild.id}.logs.logSystem.channel-created`)) || ':x:'}
**Channel Deleted:** ${(await db.get(`servers.${msg.guild.id}.logs.logSystem.channel-deleted`)) || ':x:'}
**Channel Updated:** ${(await db.get(`servers.${msg.guild.id}.logs.logSystem.channel-updated`)) || ':x:'}
**Emojis:** ${(await db.get(`servers.${msg.guild.id}.logs.logSystem.emoji`)) || ':x:'}
**Member Joined:** ${(await db.get(`servers.${msg.guild.id}.logs.logSystem.member-join`)) || ':x:'}
**Member Leave:** ${(await db.get(`servers.${msg.guild.id}.logs.logSystem.member-leave`)) || ':x:'}
**Message Edited:** ${(await db.get(`servers.${msg.guild.id}.logs.logSystem.message-edited`)) || ':x:'}
**Message Deleted:** ${(await db.get(`servers.${msg.guild.id}.logs.logSystem.message-deleted`)) || ':x:'}
**Thread Channel Created:** ${(await db.get(`servers.${msg.guild.id}.logs.logSystem.thread-created`)) || ':x:'}
**Thread Channel Deleted:** ${(await db.get(`servers.${msg.guild.id}.logs.logSystem.thread-deleted`)) || ':x:'}
**Voice Channel Created:** ${(await db.get(`servers.${msg.guild.id}.logs.logSystem.v-channel-created`)) || ':x:'}
**Voice Channel Deleted:** ${(await db.get(`servers.${msg.guild.id}.logs.logSystem.v-channel-deleted`)) || ':x:'}
**Role Created:** ${(await db.get(`servers.${msg.guild.id}.logs.logSystem.role-created`)) || ':x:'}
**Role Deleted:** ${(await db.get(`servers.${msg.guild.id}.logs.logSystem.role-deleted`)) || ':x:'}
**Role Updated:** ${(await db.get(`servers.${msg.guild.id}.logs.logSystem.role-updated`)) || ':x:'}
**Stickers:** ${(await db.get(`servers.${msg.guild.id}.logs.logSystem.sticker`)) || ':x:'}
`,
          inline: true,
        },
        {
          name: 'System Status',
          value: `
**Bulk Messages Deleted:** ${(await db.get(`servers.${msg.guild.id}.logs.bulk-messages-deleted`)) || '0'}
**Channels Created:** ${(await db.get(`servers.${msg.guild.id}.logs.channel-created`)) || '0'}
**Channels Deleted:** ${(await db.get(`servers.${msg.guild.id}.logs.channel-deleted`)) || '0'}
**Channels Updated:** ${(await db.get(`servers.${msg.guild.id}.logs.channel-updated`)) || '0'}
**Emojis:** ${(await db.get(`servers.${msg.guild.id}.logs.emoji`)) || '0'}
**Members Joined:** ${(await db.get(`servers.${msg.guild.id}.logs.member-joined`)) || '0'}
**Members Left:** ${(await db.get(`servers.${msg.guild.id}.logs.member-leave`)) || '0'}
**Messages Edited:** ${(await db.get(`servers.${msg.guild.id}.logs.message-edited`)) || '0'}
**Messages Deleted:** ${(await db.get(`servers.${msg.guild.id}.logs.message-deleted`)) || '0'}
**Thread Channels Created:** ${(await db.get(`servers.${msg.guild.id}.logs.thread-deleted`)) || '0'}
**Thread Channels Deleted:** ${(await db.get(`servers.${msg.guild.id}.logs.thread-deleted`)) || '0'}
**Voice Channels Created:** ${(await db.get(`servers.${msg.guild.id}.logs.v_channel-created`)) || '0'}
**Voice Channels Deleted:** ${(await db.get(`servers.${msg.guild.id}.logs.v_channel-deleted`)) || '0'}
**Roles Created:** ${(await db.get(`servers.${msg.guild.id}.logs.role-created`)) || '0'}
**Roles Deleted:** ${(await db.get(`servers.${msg.guild.id}.logs.role-deleted`)) || '0'}
**Roles Updated:** ${(await db.get(`servers.${msg.guild.id}.logs.role-updated`)) || '0'}
**Stickers:** ${(await db.get(`servers.${msg.guild.id}.logs.sticker`)) || '0'}
**Total:** ${(await db.get(`servers.${msg.guild.id}.logs.all`)) || '0'}
`,
          inline: true,
        },
        { name: 'Log Channel', value: `<#${await db.get(`servers.${msg.guild.id}.logs.channel`)}>` },
      ])
      .setFooter({ text: 'Log System V4.0' });

    if (msg.guild.members.me.permissions.has('ManageMessages')) msg.delete();
    return msg.channel.send({ embeds: [embed] });
  }
}

module.exports = logSystem;
