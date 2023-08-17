import { EmbedBuilder } from 'discord.js';
import { QuickDB } from 'quick.db';
const db = new QuickDB();

export async function run(client, oldStageInstance, newStageInstance) {
  if (oldStageInstance === newStageInstance) return;

  const logChan = await db.get(`servers.${oldStageInstance.guild.id}.logs.channel`);
  if (!logChan) return;

  const logSys = await db.get(`servers.${oldStageInstance.guild.id}.logs.logSystem.stage-channel-updated`);
  if (logSys !== 'enabled') return;

  let catUp = false;
  let newCategoryName = 'None';
  if (!oldStageInstance.parent && newStageInstance.parent) {
    catUp = true;
    newCategoryName = newStageInstance.parent.name;
  } else if (
    (!oldStageInstance.parent && !newStageInstance.parent) ||
    oldStageInstance.parent === newStageInstance.parent
  ) {
    catUp = false;
  } else if (oldStageInstance.parent && !newStageInstance.parent) {
    catUp = true;
  } else if (oldStageInstance.parent !== newStageInstance.parent) {
    catUp = true;
    newCategoryName = newStageInstance.parent.name;
  }

  const embed = new EmbedBuilder()
    .setTitle(`Stage Channel "${oldStageInstance.name}" Updated`)
    .setColor('#EE82EE')
    .setFooter({ text: `ID: ${newStageInstance.id}` })
    .setTimestamp();

  if (oldStageInstance.name !== newStageInstance.name)
    embed.addFields([{ name: 'New Name', value: newStageInstance.name, inline: true }]);

  if (oldStageInstance.topic !== newStageInstance.topic)
    embed.addFields([
      { name: 'Old Topic', value: oldStageInstance.topic, inline: true },
      { name: 'New Topic', value: newStageInstance.topic, inline: true },
    ]);

  if (oldStageInstance.bitrate !== newStageInstance.bitrate)
    embed.addFields([
      { name: 'Old Bitrate', value: oldStageInstance.bitrate.toLocaleString(), inline: true },
      { name: 'New Bitrate', value: newStageInstance.bitrate.toLocaleString(), inline: true },
    ]);

  if (catUp)
    embed.addFields([
      { name: 'Old Category', value: oldStageInstance.parent.name, inline: true },
      { name: 'New Category', value: newCategoryName, inline: true },
    ]);

  return oldStageInstance.guild.channels.cache
    .get(logChan)
    .send({ embeds: [embed] })
    .catch(() => {});
}
