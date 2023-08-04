const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

module.exports = class {
  constructor(client) {
    this.client = client;
  }

  async run(stage) {
    const logChan = await db.get(`servers.${stage.guild.id}.logs.channel`);
    if (!logChan) return;

    const logSys = await db.get(`servers.${stage.guild.id}.logs.logSystem.stage-channel-deleted`);
    if (logSys !== 'enabled') return;

    const embed = new EmbedBuilder()
      .setTitle('Stage Channel Deleted')
      .setColor('#FF0000')
      .addFields([
        { name: 'Name', value: stage.name },
        { name: 'Category', value: stage.parent?.name || 'None' },
      ])
      .setFooter({ text: `ID: ${stage.id}` })
      .setTimestamp();
    stage.guild.channels.cache
      .get(logChan)
      .send({ embeds: [embed] })
      .catch(() => {});

    await db.add(`servers.${stage.guild.id}.logs.stage-channel-deleted`, 1);
    await db.add(`servers.${stage.guild.id}.logs.all`, 1);
  }
};
