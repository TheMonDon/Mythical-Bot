const db = require('quick.db');
const { EmbedBuilder } = require('discord.js');

module.exports = class {
  constructor (client) {
    this.client = client;
  }

  async run (stage, newStage) {
    const logChan = db.get(`servers.${stage.guild.id}.logs.channel`);
    if (!logChan) return;

    const logSys = db.get(`servers.${stage.guild.id}.logs.logSystem.stage-channel-updated`);
    if (logSys !== 'enabled') return;

    const logChannel = stage.guild.channels.cache.get(logChan);
    if (!logChannel.permissionsFor(this.client.user.id).has('SendMessages')) return;

    if (stage === newStage) return;

    let catUp;
    if ((stage.parent === newStage.parent) || (!stage.parent && !newStage.parent)) {
      catUp = 'Updated: ❌';
    } else if ((!stage.parent && newStage.parent) || (stage.parent !== newStage.parent)) {
      catUp = `Updated: ✅ \n New Category: ${newStage.parent.name}`;
    } else if (stage.parent && !newStage.parent) {
      catUp = 'Updated: ✅ \n New Category: `None`';
    }

    const embed = new EmbedBuilder()
      .setTitle(`Stage Channel ${stage.name} Updated`)
      .setColor('#EE82EE')
      .addFields([
        { name: 'Name', value: (stage.name === newStage.name) ? 'Updated: ❌' : `Updated: ✅ \n New Name: ${newStage.name}`, inline: true },
        { name: 'Topic', value: (stage.topic === newStage.topic) ? 'Updated: ❌' : `Updated: ✅ \n New Topic: ${newStage.topic}`, inline: true },
        { name: 'Bitrate', value: (stage.bitrate === newStage.bitrate) ? 'Updated: ❌' : `Updated: ✅ \n New Bitrate: ${newStage.bitrate}`, inline: true },
        { name: 'Category', value: catUp, inline: true }
      ])
      .setFooter({ text: `ID: ${newStage.id}` })
      .setTimestamp();

    stage.guild.channels.cache.get(logChan).send({ embeds: [embed] });
    db.add(`servers.${stage.guild.id}.logs.stage-channel-updated`, 1);
    db.add(`servers.${stage.guild.id}.logs.all`, 1);
  }
};
