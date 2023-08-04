const db = require('quick.db');
const { EmbedBuilder } = require('discord.js');

module.exports = class {
  constructor(client) {
    this.client = client;
  }

  async run(stage, newStage) {
    if (stage === newStage) return;

    const logChan = db.get(`servers.${stage.guild.id}.logs.channel`);
    if (!logChan) return;

    const logSys = db.get(`servers.${stage.guild.id}.logs.logSystem.stage-channel-updated`);
    if (logSys !== 'enabled') return;

    let catUp = false;
    let newCategoryName = 'None';
    if (!stage.parent && newStage.parent) {
      catUp = true;
      newCategoryName = newStage.parent.name;
    } else if ((!stage.parent && !newStage.parent) || stage.parent === newStage.parent) {
      catUp = false;
    } else if (stage.parent && !newStage.parent) {
      catUp = true;
    } else if (stage.parent !== newStage.parent) {
      catUp = true;
      newCategoryName = newStage.parent.name;
    }

    const embed = new EmbedBuilder()
      .setTitle(`Stage Channel "${stage.name}" Updated`)
      .setColor('#EE82EE')
      .setFooter({ text: `ID: ${newStage.id}` })
      .setTimestamp();

    if (stage.name !== newStage.name) embed.addFields([{ name: 'New Name', value: newStage.name, inline: true }]);

    if (stage.topic !== newStage.topic)
      embed.addFields([
        { name: 'Old Topic', value: stage.topic, inline: true },
        { name: 'New Topic', value: newStage.topic, inline: true },
      ]);

    if (stage.bitrate !== newStage.bitrate)
      embed.addFields([
        { name: 'Old Bitrate', value: stage.bitrate.toLocalerString(), inline: true },
        { name: 'New Bitrate', value: newStage.bitrate.toLocalerString(), inline: true },
      ]);

    if (catUp)
      embed.addFields([
        { name: 'Old Category', value: stage.parent.name, inline: true },
        { name: 'New Category', value: newCategoryName, inline: true },
      ]);

    stage.guild.channels.cache
      .get(logChan)
      .send({ embeds: [embed] })
      .catch(() => {});

    db.add(`servers.${stage.guild.id}.logs.stage-channel-updated`, 1);
    db.add(`servers.${stage.guild.id}.logs.all`, 1);
  }
};
