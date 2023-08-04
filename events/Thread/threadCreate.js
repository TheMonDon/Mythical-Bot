const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

module.exports = class {
  constructor(client) {
    this.client = client;
  }

  async run(thread) {
    if (thread.joinable) await thread.join();

    const logChan = await db.get(`servers.${thread.guild.id}.logs.channel`);
    if (!logChan) return;

    const logSys = await db.get(`servers.${thread.guild.id}.logs.logSystem.thread-created`);
    if (logSys !== 'enabled') return;

    const chans = (await db.get(`servers.${thread.guild.id}.logs.noLogChans`)) || [];
    if (chans.includes(thread.id)) return;

    const embed = new EmbedBuilder()
      .setTitle('Thread Channel Created')
      .setColor('#20fc3a')
      .addFields([
        { name: 'Name', value: thread.name },
        { name: 'Category', value: thread.parent?.name || 'None' },
      ])
      .setFooter({ text: `ID: ${thread.id}` })
      .setTimestamp();
    thread.guild.channels.cache
      .get(logChan)
      .send({ embeds: [embed] })
      .catch(() => {});

    await db.add(`servers.${thread.guild.id}.logs.thread-created`, 1);
    await db.add(`servers.${thread.guild.id}.logs.all`, 1);
  }
};
