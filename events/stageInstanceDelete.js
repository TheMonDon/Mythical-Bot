const db = require('quick.db');
const { EmbedBuilder } = require('discord.js');

module.exports = class {
  constructor (client) {
    this.client = client;
  }

  async run (stage) {
    const logChan = db.get(`servers.${stage.guild.id}.logs.channel`);
    if (!logChan) return;

    const logSys = db.get(`servers.${stage.guild.id}.logs.logSystem.stage-channel-deleted`);
    if (logSys !== 'enabled') return;

    const logChannel = stage.guild.channels.cache.get(logChan);
    if (!logChannel.permissionsFor(this.client.user.id).has('SendMessages')) return;

    const embed = new EmbedBuilder()
      .setTitle('Stage Channel Deleted')
      .setColor('#FF0000')
      .addFields([
        { name: 'Name', value: stage.name },
        { name: 'Category', value: stage.parent?.name || 'None' }
      ])
      .setFooter({ text: `ID: ${stage.id}` })
      .setTimestamp();
    stage.guild.channels.cache.get(logChan).send({ embeds: [embed] });

    db.add(`servers.${stage.guild.id}.logs.stage-channel-deleted`, 1);
    db.add(`servers.${stage.guild.id}.logs.all`, 1);
  }
};
