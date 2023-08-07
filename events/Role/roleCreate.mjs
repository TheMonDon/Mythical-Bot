import { EmbedBuilder } from 'discord.js';
import { QuickDB } from 'quick.db';
const db = new QuickDB();

export async function run(client, role) {
  const logChan = await db.get(`servers.${role.guild.id}.logs.channel`);
  if (!logChan) return;

  const logSys = await db.get(`servers.${role.guild.id}.logs.logSystem.role-created`);
  if (logSys !== 'enabled') return;

  const embed = new EmbedBuilder()
    .setTitle('Role Created')
    .setColor('#20fc3a')
    .addFields([
      { name: 'Name', value: role.name },
      { name: 'Managed', value: role.managed.toString() },
      { name: 'Position', value: role.position.toString() },
    ])
    .setFooter({ text: `ID: ${role.id}` })
    .setTimestamp();

  role.guild.channels.cache
    .get(logChan)
    .send({ embeds: [embed] })
    .catch(() => {});

  await db.add(`servers.${role.guild.id}.logs.role-created`, 1);
  await db.add(`servers.${role.guild.id}.logs.all`, 1);
}
