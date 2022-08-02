const db = require('quick.db');
const { EmbedBuilder } = require('discord.js');

module.exports = class {
  constructor (client) {
    this.client = client;
  }

  async run (msg) {
    if (msg.author.bot) return;
    if (!msg.guild) return;

    const logChan = db.get(`servers.${msg.guild.id}.logs.channel`);
    if (!logChan) return;

    const logSys = db.get(`servers.${msg.guild.id}.logs.log_system.message-deleted`);
    if (logSys !== 'enabled') return;

    const chans = db.get(`servers.${msg.guild.id}.logs.noLogChans`) || [];
    if (chans.includes(msg.channel.id)) return;
    const logChannel = msg.guild.channels.cache.get(logChan);
    if (!logChannel.permissionsFor(this.client.user.id).has('SendMessages')) return;

    if (!msg.content) return;

    let delby;
    if (msg.guild.members.me.permissions.has('ViewAuditLog')) {
      msg.guild.fetchAuditLogs()
        .then(audit => {
          delby = audit.entries.first().executor;
        })
        .catch(console.error);
    }

    const embed = new EmbedBuilder()
      .setTitle('Message Deleted')
      .setColor('#FF0000')
      .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
      .setThumbnail(msg.author.displayAvatarURL())
      .addFields([
        { name: 'Deleted Text', value: (msg.content.length <= 1024) ? msg.content : `${msg.content.substring(0, 1020)}...` },
        { name: 'Channel', value: `<#${msg.channel.id}>` },
        { name: 'Message Author', value: `${msg.author} (${msg.author.tag})` }
      ]);

    if (delby && (msg.author !== delby)) embed.addFields([{ name: 'Deleted By', value: delby }]);
    (msg.mentions.users.size === 0) ? embed.addFields({ name: 'Mentioned Users', value: 'None' }) : embed.addFields([{ name: 'Mentioned Users', value: `Mentioned Member Count: ${[...msg.mentions.users.values()].length} \n Mentioned Users List: \n ${[...msg.mentions.users.values()]}` }]);
    embed.setTimestamp()
      .setFooter({ text: `Message ID: ${msg.id}` });
    logChannel.send({ embeds: [embed] });

    db.add(`servers.${msg.guild.id}.logs.message-deleted`, 1);
    db.add(`servers.${msg.guild.id}.logs.all`, 1);
  }
};
