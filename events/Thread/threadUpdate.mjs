import { EmbedBuilder } from 'discord.js';

// Temp cache for delayed updates
const threadUpdateQueue = new Map();

export async function run(client, oldThread, newThread) {
  if (
    oldThread.name === newThread.name &&
    oldThread.locked === newThread.locked &&
    oldThread.archived === newThread.archived
  )
    return;

  const connection = await client.db.getConnection();

  try {
    const [logRows] = await connection.execute(
      /* sql */ `
        SELECT
          channel_id,
          thread_updated,
          no_log_channels
        FROM
          log_settings
        WHERE
          server_id = ?
      `,
      [oldThread.guild.id],
    );
    if (!logRows.length) return;

    const logChannelID = logRows[0].channel_id;
    if (!logChannelID) return;

    const logSystem = logRows[0].thread_updated;
    if (logSystem !== 1) return;
    if (oldThread.name.startsWith('ticket-')) return;
    if (oldThread.parent?.name?.startsWith('ticket-')) return;

    const noLogChans = JSON.parse(logRows[0].no_log_channels || '[]');
    if (noLogChans.includes(oldThread.parent?.id)) return;
    if (noLogChans.includes(oldThread.id)) return;

    const threadId = newThread.id;

    // Snapshot values at the moment of update
    const changes = {
      old: {
        name: oldThread.name,
        archived: oldThread.archived,
        locked: oldThread.locked,
        parent: oldThread.parent,
        id: oldThread.id,
      },
      current: {
        name: newThread.name,
        archived: newThread.archived,
        locked: newThread.locked,
        parent: newThread.parent,
        id: newThread.id,
      },
    };

    if (threadUpdateQueue.has(threadId)) {
      const queued = threadUpdateQueue.get(threadId);

      // Only update the latest values
      queued.snapshot.current = changes.current;

      clearTimeout(queued.timeout);
      queued.timeout = setTimeout(() => flushThreadUpdate(threadId, newThread.guild, logChannelID), 5000);
    } else {
      threadUpdateQueue.set(threadId, {
        snapshot: {
          old: { ...changes.old },
          current: { ...changes.current },
        },
        timeout: setTimeout(() => flushThreadUpdate(threadId, newThread.guild, logChannelID), 5000),
      });
    }
  } catch (error) {
    client.logger.error(error);
  } finally {
    connection.release();
  }
}

async function flushThreadUpdate(threadId, guild, logChannelID) {
  const { snapshot } = threadUpdateQueue.get(threadId) || {};
  if (!snapshot) return;

  threadUpdateQueue.delete(threadId);

  const { old, current } = snapshot;

  const embed = new EmbedBuilder()
    .setTitle(`Thread "${old.name}" Updated`)
    .setColor('#EE82EE')
    .setDescription(`<#${current.id}>`)
    .setFooter({ text: `ID: ${current.id}` })
    .setTimestamp();

  if (old.locked !== current.locked) {
    embed.addFields([
      {
        name: 'Locked',
        value: current.locked ? '✅ Yes' : '❌ No',
        inline: true,
      },
    ]);
  }

  if (old.archived !== current.archived) {
    embed.addFields([
      {
        name: 'Archived',
        value: current.archived ? '✅ Yes' : '❌ No',
        inline: true,
      },
    ]);
  }

  if (old.name !== current.name) {
    embed.addFields([
      { name: 'Old Name', value: old.name || 'Unknown' },
      { name: 'New Name', value: current.name || 'Unknown' },
    ]);
  }

  let updatedBy;
  if (guild.members.me.permissions.has('ViewAuditLog')) {
    await guild
      .fetchAuditLogs()
      .then((audit) => {
        updatedBy = audit.entries.first().executor;
      })
      .catch(console.error);
  }

  if (embed.data.fields?.length === 0) return;

  if (updatedBy) {
    embed.addFields([{ name: 'Updated By', value: updatedBy.toString() }]);
  }

  embed.addFields([{ name: 'Parent Channel', value: current.parent?.name || 'None' }]);

  // Send to a log channel
  let logChannel = guild.channels.cache.get(logChannelID);
  if (!logChannel) {
    logChannel = await guild.channels.fetch(logChannelID);
  }

  if (!logChannel) return;

  return logChannel.send({ embeds: [embed] }).catch(() => {});
}
