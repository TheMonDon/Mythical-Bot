const db = require('quick.db');
const DiscordJS = require('discord.js');

module.exports = class {
  constructor (client) {
    this.client = client;
  }

  // eslint-disable-next-line no-unused-vars
  async run (msg) {
    if (msg.author.bot) return;

    const logChan = db.get(`servers.${msg.guild.id}.logs.channel`);
    if (!logChan) return;
  
    const logSys = db.get(`servers.${msg.guild.id}.logs.log_system.message-deleted`);
    if (logSys !== 'enabled') return;

    let delby;
    if (msg.guild.me.permissions.has('VIEW_AUDIT_LOG')) {
      msg.guild.fetchAuditLogs()
        .then(audit => {
          delby = audit.entries.first().executor;
        })
        .catch(console.error);
    }
  
    const embed = new DiscordJS.MessageEmbed();
    embed.setTitle('Message Deleted');
    embed.setAuthor(msg.author.tag, msg.author.displayAvatarURL());
    embed.setThumbnail(msg.author.displayAvatarURL());
    embed.addField('Deleted Text', (msg.content.length <= 1024) ? msg.content : `${msg.content.substring(0, 1020)}...`, true);
    embed.addField('Channel', msg.channel, true);
    embed.addField('Message Author', `${msg.author} (${msg.author.tag})`, true);
    (delby) ? (msg.author !== delby) ? embed.addField('Deleted By', delby, true) : '' : '';
    (msg.mentions.users.size === 0) ? embed.addField('Mentioned Users', 'None', true): embed.addField('Mentioned Users', `Mentioned Member Count: ${msg.mentions.users.array().length} \n Mentioned Users List: \n ${msg.mentions.users.array()}`, true);
    embed.setTimestamp();
    embed.setFooter(`Message ID: ${msg.id}`);
    msg.guild.channels.cache.get(logChan).send(embed);
    db.add(`servers.${msg.guild.id}.logs.message-deleted`, 1);
    db.add(`servers.${msg.guild.id}.logs.all`, 1);
  }
};