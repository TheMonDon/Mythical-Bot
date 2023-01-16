const db = require('quick.db');
const { EmbedBuilder } = require('discord.js');

module.exports = class {
  constructor (client) {
    this.client = client;
  }

  async run (stage) {
    const logChan = db.get(`servers.${stage.guild.id}.logs.stage`);
    if (!logChan) return;

    const logSys = db.get(`servers.${stage.guild.id}.logs.logSystem.stage-channel-created`);
    if (logSys !== 'enabled') return;

    const embed = new EmbedBuilder()
      .setTitle('Stage Channel Created')
      .setColor('#20fc3a')
      .addFields([
        { name: 'Name', value: stage.name },
        { name: 'Category', value: stage.parent?.name || 'None' }
      ])
      .setFooter({ text: `ID: ${stage.id}` })
      .setTimestamp();
    stage.guild.channels.cache.get(logChan).send({ embeds: [embed] }).catch(() => {});

    db.add(`servers.${stage.guild.id}.logs.stage-channel-created`, 1);
    db.add(`servers.${stage.guild.id}.logs.all`, 1);
  }
};
