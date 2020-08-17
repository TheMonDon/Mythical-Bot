const Command = require('../../base/Command.js');
const Discord = require('discord.js');
const db = require('quick.db');
const { stripIndents } = require('common-tags');

class logsystem extends Command {
  constructor (client) {
    super(client, {
      name: 'logsystem',
      description: 'See information about the log system',
      usage: 'logsystem',
      category: 'Logging',
      permLevel: 'Moderator'
    });
  }

  async run (msg) { // eslint-disable-line no-unused-vars
    if (!db.get(`servers.${msg.guild.id}.logs.channel`)) return msg.channel.send(`The log system is not set up! Use \`${msg.settings.prefix}setlogchannel <channel>\``);
    const embed = new Discord.MessageEmbed();

    embed.setColor('#36393F');
    embed.addField('Toggle Status', stripIndents(`
**Channel Created:** ${(db.get(`servers.${msg.guild.id}.logs.log_system.channel-created`)|| ':x:')}
**Channel Deleted:** ${(db.get(`servers.${msg.guild.id}.logs.log_system.channel-deleted`) || ':x:')}
**Channel Updated:** ${(db.get(`servers.${msg.guild.id}.logs.log_system.channel-updated`)|| ':x:')}
**Voice Channel Created:** ${(db.get(`servers.${msg.guild.id}.logs.log_system.v-channel-created`) || ':x:')}
**Voice Channel Deleted:** ${(db.get(`servers.${msg.guild.id}.logs.log_system.v-channel-deleted`) || ':x:')}
**Member Joined:** ${(db.get(`servers.${msg.guild.id}.logs.log_system.member-join`) || ':x:')}
**Member Leave:** ${(db.get(`servers.${msg.guild.id}.logs.log_system.member-leave`) || ':x:')}
**Message Edited:** ${(db.get(`servers.${msg.guild.id}.logs.log_system.message-edited`) || ':x:')}
**Message Deleted:** ${(db.get(`servers.${msg.guild.id}.logs.log_system.message-deleted`) || ':x:')}
**Role Created:** ${(db.get(`servers.${msg.guild.id}.logs.log_system.role-created`) || ':x:')}
**Role Deleted:** ${(db.get(`servers.${msg.guild.id}.logs.log_system.role-deleted`) || ':x:')}
**Role Updated:** ${(db.get(`servers.${msg.guild.id}.logs.log_system.role-updated`) || ':x:')}
**Emoji Created:** ${(db.get(`servers.${msg.guild.id}.logs.log_system.emoji-created`) || ':x:')}
**Emoji Deleted:** ${(db.get(`servers.${msg.guild.id}.logs.log_system.emoji-deleted`) || ':x:')}
`), true);
    embed.addField('System Status', stripIndents(`
**Total:** ${(db.get(`servers.${msg.guild.id}.logs.all`)) || '0'}
**Channels Created:** ${(db.get(`servers.${msg.guild.id}.logs.log_system.channel_created`) || '0')}
**Channels Deleted:** ${(db.get(`servers.${msg.guild.id}.logs.log_system.channel_deleted`) || '0')}
**Channels Updated:** ${(db.get(`servers.${msg.guild.id}.logs.log_system.channel_updated`) || '0')}
**Voice Channels Created:** ${(db.get(`servers.${msg.guild.id}.logs.log_system.v_channel_created`) || '0')}
**Voice Channels Deleted:** ${(db.get(`servers.${msg.guild.id}.logs.log_system.v_channel_deleted`) || '0')}
**Members Joined:** ${(db.get(`servers.${msg.guild.id}.logs.log_system.member_joined`) || '0')}
**Members Left:** ${(db.get(`servers.${msg.guild.id}.logs.log_system.member_leave`) || '0')}
**Messages Edited:** ${(db.get(`servers.${msg.guild.id}.logs.log_system.message_edited`) || '0')}
**Messages Deleted:** ${(db.get(`servers.${msg.guild.id}.logs.log_system.message_deleted`) || '0')}
**Roles Created:** ${(db.get(`servers.${msg.guild.id}.logs.log_system.role_created`) || '0')}
**Roles Deleted:** ${(db.get(`servers.${msg.guild.id}.logs.log_system.role_deleted`) || '0')}
**Roles Updated:** ${(db.get(`servers.${msg.guild.id}.logs.log_system.role_updated`) || '0')}
**Emojis Created:** ${(db.get(`servers.${msg.guild.id}.logs.log_system.emoji_created`) || '0')}
**Emojis Deleted:** ${(db.get(`servers.${msg.guild.id}.logs.log_system.emoji_deleted`) || '0')}
`), true);
    embed.setFooter('Logs System V3.0-BETA');
    if (msg.guild.me.permissions.has('MANAGE_MESSAGES')) msg.delete();
    msg.channel.send(embed);
  }
}

module.exports = logsystem;