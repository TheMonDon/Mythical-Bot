import { EmbedBuilder } from 'discord.js';
import { QuickDB } from 'quick.db';
const db = new QuickDB();

export async function run(client, stageInstance) {
  const logChan = await db.get(`servers.${stageInstance.guild.id}.logs.stage`);
  if (!logChan) return;

  const logSys = await db.get(`servers.${stageInstance.guild.id}.logs.logSystem.stage-channel-created`);
  if (logSys !== 'enabled') return;

  const embed = new EmbedBuilder()
    .setTitle('Stage Channel Created')
    .setColor(client.getSettings(stageInstance.guild).embedSuccessColor)
    .addFields([
      { name: 'Name', value: stageInstance.name },
      { name: 'Category', value: stageInstance.parent?.name || 'None' },
    ])
    .setFooter({ text: `ID: ${stageInstance.id}` })
    .setTimestamp();

  stageInstance.guild.channels.cache
    .get(logChan)
    .send({ embeds: [embed] })
    .catch(() => {});

  await db.add(`servers.${stageInstance.guild.id}.logs.stage-channel-created`, 1);
  await db.add(`servers.${stageInstance.guild.id}.logs.all`, 1);
}
