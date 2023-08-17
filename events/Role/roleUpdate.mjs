import { EmbedBuilder } from 'discord.js';
import { QuickDB } from 'quick.db';
const db = new QuickDB();

export async function run(client, oldRole, newRole) {
  if (oldRole === newRole) return;
  if (oldRole.name === newRole.name && oldRole.hexColor === newRole.hexColor) return;

  const logChan = await db.get(`servers.${newRole.guild.id}.logs.channel`);
  if (!logChan) return;

  const logSystem = await db.get(`servers.${newRole.guild.id}.logs.logSystem.role-updated`);
  if (logSystem !== 'enabled') return;

  const embed = new EmbedBuilder()
    .setTitle(`Role "${oldRole.name}" Updated`)
    .setColor(newRole.hexColor)
    .setFooter({ text: `ID: ${newRole.id}` })
    .setTimestamp();

  if (oldRole.name !== newRole.name) embed.addFields([{ name: 'New Name', value: newRole.name, inline: true }]);
  if (oldRole.hexColor !== newRole.hexColor)
    embed.addFields([
      { name: 'Old Color', value: oldRole.hexColor.toString(), inline: true },
      { name: 'New Color', value: newRole.hexColor.toString(), inline: true },
    ]);

  if (embed.data.fields?.length === 0) return;

  return newRole.guild.channels.cache
    .get(logChan)
    .send({ embeds: [embed] })
    .catch(() => {});
}
