const db = require('quick.db');
const DiscordJS = require('discord.js');

module.exports = class {
  constructor (client) {
    this.client = client;
  }

  async run (thread) {
    const logChan = db.get(`servers.${thread.guild.id}.logs.channel`);
    if (!logChan) return;

    const logSys = db.get(`servers.${thread.guild.id}.logs.log_system.thread-deleted`);
    if (logSys !== 'enabled') return;
    if (thread.name.startsWith('ticket-')) return;

    const chans = db.get(`servers.${thread.guild.id}.logs.noLogChans`) || [];
    if (chans.includes(thread.id)) return;

    const logchan = thread.guild.channels.cache.get(logChan);
    if (!logchan.permissionsFor(this.client.user.id).has('SEND_MESSAGES')) return;

    const embed = new DiscordJS.MessageEmbed()
      .setTitle('Thread Channel Deleted')
      .setColor('RED')
      .addField('Name', thread.name, true)
      .addField('Category', thread.parent?.name || 'None', true)
      .setFooter({ text: `ID: ${thread.id}` })
      .setTimestamp();
    thread.guild.channels.cache.get(logChan).send({ embeds: [embed] });

    db.add(`servers.${thread.guild.id}.logs.thread-deleted`, 1);
    db.add(`servers.${thread.guild.id}.logs.all`, 1);
  }
};
