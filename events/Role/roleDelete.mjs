import { EmbedBuilder } from 'discord.js';
import { QuickDB } from 'quick.db';
const db = new QuickDB();

export async function run(client, role) {
  const logChan = await db.get(`servers.${role.guild.id}.logs.channel`);
  if (!logChan) return;

  const logSys = await db.get(`servers.${role.guild.id}.logs.logSystem.role-deleted`);
  if (logSys !== 'enabled') return;

  const embed = new EmbedBuilder()
    .setTitle('Role Deleted')
    .setColor('#FF0000')
    .addFields([
      { name: 'Name', value: role.name, inline: true },
      { name: 'Managed', value: role.managed.toString(), inline: true },
    ])
    .setFooter({ text: `Role ID: ${role.id}` })
    .setTimestamp();

  if (role.hexColor.toString() !== '#000000') embed.addFields({ name: 'Color', value: role.hexColor.toString() });

  role.guild.channels.cache
    .get(logChan)
    .send({ embeds: [embed] })
    .catch(() => {});

  await db.add(`servers.${role.guild.id}.logs.role-deleted`, 1);
  await db.add(`servers.${role.guild.id}.logs.all`, 1);
}
