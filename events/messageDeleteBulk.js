const db = require('quick.db');
const { EmbedBuilder } = require('discord.js');
const hastebin = require('hastebin');

module.exports = class {
  constructor (client) {
    this.client = client;
  }

  async run (messages) {
    const server = messages.first().guild;
    const chan = messages.first().channel;

    const logChan = db.get(`servers.${server.id}.logs.channel`);
    if (!logChan) return;

    const logSys = db.get(`servers.${server.id}.logs.log_system.bulk-messages-deleted`);
    if (logSys !== 'enabled') return;

    const chans = db.get(`servers.${server.id}.logs.noLogChans`) || [];
    if (chans.includes(chan.id)) return;
    const logChannel = server.channels.cache.get(logChan);
    if (!logChannel.permissionsFor(this.client.user.id).has('SEND_MESSAGES')) return;

    const output = [];
    output.push(`${messages.size} messages deleted in ${chan.name}:`);
    output.push('\n');
    output.push('\n');
    messages.forEach(m => {
      output.push(`${m.author.tag} (User ID: ${m.author.id} Mesage ID: ${m.id})\n`);
      output.push(m.content ? m.content : 'No text included in this message, or it was an embed.');
      output.push('\n');
      output.push('\n');
    });
    const text = output.join('');

    let url;

    await hastebin.createPaste(text, {
      raw: true,
      contentType: 'text/plain',
      server: 'https://haste.crafters-island.com'
    })
      .then(function (urlToPaste) {
        url = urlToPaste;
      })
      .catch(function (requestError) { this.client.logger.error(requestError); });

    const embed = new EmbedBuilder()
      .setTitle('Bulk Messages Deleted')
      .setColor('#FF0000')
      .addFields([
        { name: 'Deleted Messages', value: url },
        { name: 'Deleted Amount', value: messages.size },
        { name: 'Channel', value: `<#${chan.id}>` }
      ]);
    logChannel.send({ embeds: [embed] });

    db.add(`servers.${server.id}.logs.bulk-messages-deleted`, 1);
    db.add(`servers.${server.id}.logs.all`, 1);
  }
};
