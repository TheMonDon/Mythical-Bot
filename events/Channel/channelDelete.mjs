import { EmbedBuilder } from 'discord.js';

export async function run(client, channel) {
  try {
    const [logRows] = await client.db.execute(
      /* sql */ `
        SELECT
          *
        FROM
          log_settings
        WHERE
          server_id = ?
      `,
      [channel.guild.id],
    );
    if (!logRows.length) return;

    const logChannelID = logRows[0].channels_channel_id || logRows[0].channel_id;
    if (!logChannelID) return;

    const logSystem = logRows[0].channel_deleted;
    if (logSystem !== 1) return;
    if (channel.name.startsWith('ticket-')) return;

    const noLogChans = JSON.parse(logRows[0].no_log_channels || '[]');
    if (noLogChans.includes(channel.id)) return;

    let embed;
    if (channel.type === 0) {
      embed = new EmbedBuilder()
        .setTitle('Channel Deleted')
        .setColor(client.getSettings(channel.guild).embedErrorColor)
        .addFields([
          { name: 'Name', value: channel.name },
          { name: 'Category', value: channel.parent?.name || 'None' },
          { name: 'Topic', value: channel.topic || 'None' },
          { name: 'NSFW', value: channel.nsfw ? 'Yes' : 'No', inline: true },
        ])
        .setFooter({ text: `Channel ID: ${channel.id}` })
        .setTimestamp();
    } else if (channel.type === 2) {
      const enabled = logRows[0].voice_channel_deleted;
      if (!enabled) return;

      embed = new EmbedBuilder()
        .setTitle('Voice Channel Deleted')
        .setColor(client.getSettings(channel.guild).embedErrorColor)
        .addFields([
          { name: 'Name', value: channel.name },
          { name: 'Category', value: channel.parent || 'None' },
          { name: 'NSFW', value: channel.nsfw ? 'Yes' : 'No', inline: true },
        ])
        .setFooter({ text: `Channel ID: ${channel.id}` })
        .setTimestamp();
    }

    let logChannel = channel.guild.channels.cache.get(logChannelID);
    if (!logChannel) {
      logChannel = await channel.guild.channels.fetch(logChannelID);
    }

    if (!logChannel) return;

    return logChannel.send({ embeds: [embed] }).catch(() => {});
  } catch (error) {
    client.logger.error(error);
  }
}
