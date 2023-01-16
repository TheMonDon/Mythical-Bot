const db = require('quick.db');
const { EmbedBuilder } = require('discord.js');
const hastebin = require('hastebin');

module.exports = class {
  constructor (client) {
    this.client = client;
  }

  async run (msg) {
    if (msg.author.bot) return;
    if (!msg.guild) return;

    const logChan = db.get(`servers.${msg.guild.id}.logs.channel`);
    if (!logChan) return;

    const logSys = db.get(`servers.${msg.guild.id}.logs.logSystem.message-deleted`);
    if (logSys !== 'enabled') return;

    const chans = db.get(`servers.${msg.guild.id}.logs.noLogChans`) || [];
    if (chans.includes(msg.channel.id)) return;

    // Check if a game is being played by message author (hangman, connect4, etc)
    const current = this.client.games.get(msg.channel.id);
    if (current && ['connect4', 'hangman', 'wordle'].includes(current.name) && current.user === msg.author.id) return;

    let delby;
    if (msg.guild.members.me.permissions.has('ViewAuditLog')) {
      msg.guild.fetchAuditLogs()
        .then(audit => {
          delby = audit.entries.first().executor;
        })
        .catch(console.error);
    }

    let url;
    const content = [];
    let shortContent;
    let text;

    if (msg.content) content.push(msg.content) && content.push('\n');
    if (msg.embeds[0]) content.push(msg.embeds[0].description) && content.push('\n');
    if (msg.attachments.first()) content.push(msg.attachments.map(a => a.url) + '\n');
    if (content.length > 0) text = content.join('');
    else return;

    if (msg.content.length <= 1024) shortContent = msg.content;
    else shortContent = `${msg.content.substring(0, 1020)}...`;

    if (msg.content.length > 1024 || msg.attachments.first() || msg.embeds[0]) {
      await hastebin.createPaste(text, {
        raw: true,
        contentType: 'text/plain',
        server: 'https://haste.crafters-island.com'
      })
        .then(function (urlToPaste) {
          url = urlToPaste;
        })
        .catch(function (requestError) { this.client.logger.error(requestError); });
    }

    const embed = new EmbedBuilder()
      .setTitle('Message Deleted')
      .setColor('#FF0000')
      .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
      .setThumbnail(msg.author.displayAvatarURL())
      .addFields([
        { name: 'Deleted Text', value: shortContent || 'None' },
        { name: 'Deleted Text URL', value: url || 'None' },
        { name: 'Channel', value: `<#${msg.channel.id}>` },
        { name: 'Message Author', value: `${msg.author} (${msg.author.tag})` }
      ])
      .setFooter({ text: `Message ID: ${msg.id}` })
      .setTimestamp();

    if (delby && (msg.author !== delby)) embed.addFields([{ name: 'Deleted By', value: delby }]);
    (msg.mentions.users.size === 0) ? embed.addFields({ name: 'Mentioned Users', value: 'None' }) : embed.addFields([{ name: 'Mentioned Users', value: `Mentioned Member Count: ${[...msg.mentions.users.values()].length} \nMentioned Users List: \n ${[...msg.mentions.users.values()]}` }]);

    msg.guild.channels.cache.get(logChan).send({ embeds: [embed] }).catch(() => {});

    db.add(`servers.${msg.guild.id}.logs.message-deleted`, 1);
    db.add(`servers.${msg.guild.id}.logs.all`, 1);
  }
};
