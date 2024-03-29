import { EmbedBuilder } from 'discord.js';
import { QuickDB } from 'quick.db';
const db = new QuickDB();

export async function run(client, channel) {
  const logChan = await db.get(`servers.${channel.guild.id}.logs.channel`);
  if (!logChan) return;

  const logSystem = await db.get(`servers.${channel.guild.id}.logs.logSystem.channel-deleted`);
  if (logSystem !== 'enabled') return;
  if (channel.name.startsWith('ticket-')) return;

  const noLogChans = (await db.get(`servers.${channel.guild.id}.logs.noLogChans`)) || [];
  if (noLogChans.includes(channel.id)) return;

  const embed = new EmbedBuilder()
    .setTitle('Channel Deleted')
    .setColor('#FF0000')
    .addFields([
      { name: 'Name', value: channel.name },
      { name: 'Category', value: channel.parent?.name || 'None' },
    ])
    .setFooter({ text: `Channel ID: ${channel.id}` })
    .setTimestamp();

  channel.guild.channels.cache
    .get(logChan)
    .send({ embeds: [embed] })
    .catch(() => {});
}
