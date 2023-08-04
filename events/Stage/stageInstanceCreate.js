const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

module.exports = class {
  constructor(client) {
    this.client = client;
  }

  async run(stage) {
    const logChan = await db.get(`servers.${stage.guild.id}.logs.stage`);
    if (!logChan) return;

    const logSys = await db.get(`servers.${stage.guild.id}.logs.logSystem.stage-channel-created`);
    if (logSys !== 'enabled') return;

    const embed = new EmbedBuilder()
      .setTitle('Stage Channel Created')
      .setColor('#20fc3a')
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

    await db.add(`servers.${stage.guild.id}.logs.stage-channel-created`, 1);
    await db.add(`servers.${stage.guild.id}.logs.all`, 1);
  }
};
