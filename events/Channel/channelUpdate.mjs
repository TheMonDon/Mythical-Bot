import { ChannelType, EmbedBuilder } from 'discord.js';

export async function run(client, channel, newChannel) {
  if (channel === newChannel) return;
  if (
    channel.parent === newChannel.parent &&
    channel.name === newChannel.name &&
    channel.topic === newChannel.topic &&
    channel.nsfw === newChannel.nsfw &&
    channel.bitrate === newChannel.bitrate
  )
    return;
  if (channel.type === ChannelType.DM) return;

  const connection = await client.db.getConnection();

  try {
    const [logRows] = await connection.execute(
      /* sql */ `
        SELECT
          channel_id,
          channel_updated,
          no_log_channels
        FROM
          log_settings
        WHERE
          server_id = ?
      `,
      [channel.guild.id],
    );
    if (!logRows.length) return;

    const logChannelID = logRows[0].channel_id;
    if (!logChannelID) return;

    const logSystem = logRows[0].channel_updated;
    if (logSystem !== 1) return;
    if (channel.name.startsWith('ticket-')) return;

    const noLogChans = JSON.parse(logRows[0].no_log_channels || '[]');
    if (noLogChans.includes(channel.id)) return;

    let catUp = false;
    let newCategoryName = 'None';
    if (!channel.parent && newChannel.parent) {
      catUp = true;
      newCategoryName = newChannel.parent.name;
    } else if ((!channel.parent && !newChannel.parent) || channel.parent === newChannel.parent) {
      catUp = false;
    } else if (channel.parent && !newChannel.parent) {
      catUp = true;
    } else if (channel.parent !== newChannel.parent) {
      catUp = true;
      newCategoryName = newChannel.parent?.name || 'None';
    }

    const embed = new EmbedBuilder()
      .setTitle(`Channel "${channel.name}" Updated`)
      .setColor('#EE82EE')
      .setFooter({ text: `Channel ID: ${newChannel.id}` })
      .setTimestamp();

    if (channel.name !== newChannel.name) {
      embed.addFields([{ name: 'New Name', value: newChannel.name, inline: true }]);
    }

    if (channel.topic !== newChannel.topic) {
      const oldTopic = channel.topic?.substring(0, 1020) || 'None';
      const newTopic = newChannel.topic?.substring(0, 1020) || 'None';
      if (oldTopic !== newTopic) {
        embed.addFields([
          {
            name: 'Old Topic',
            value: oldTopic.length === 1020 ? `${oldTopic}...` : oldTopic,
            inline: true,
          },
          {
            name: 'New Topic',
            value: newTopic.length === 1020 ? `${newTopic}...` : newTopic,
            inline: true,
          },
        ]);
      }
    }

    if (catUp) {
      embed.addFields([
        { name: 'Old Category', value: channel.parent?.name || 'None', inline: true },
        { name: 'New Category', value: newCategoryName, inline: true },
      ]);
    }

    if (channel.type === ChannelType.GuildText) {
      if (channel.nsfw !== newChannel.nsfw)
        embed.addFields([
          {
            name: 'Age-Restricted',
            value: `Age-Restricted has been ${newChannel.nsfw ? 'turned on' : 'turned off'}`,
            inline: true,
          },
        ]);
    }

    if ([ChannelType.GuildVoice, ChannelType.GuildStageVoice].includes(channel.type)) {
      if (channel.bitrate !== newChannel.bitrate)
        embed.addFields([
          { name: 'Old Bitrate', value: channel.bitrate.toLocaleString(), inline: true },
          { name: 'New Bitrate', value: newChannel.bitrate.toLocaleString(), inline: true },
        ]);
    }

    if (embed.data.fields?.length === 0) return;

    let logChannel = channel.guild.channels.cache.get(logChannelID);
    if (!logChannel) {
      logChannel = await channel.guild.channels.fetch(logChannelID);
    }

    if (!logChannel) return;

    return logChannel.send({ embeds: [embed] }).catch(() => {});
  } catch (error) {
    client.logger.error(error);
  } finally {
    connection.release();
  }
}
