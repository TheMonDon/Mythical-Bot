import pkg from '../../config.js';
import { EmbedBuilder, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import express from 'express';
import cors from 'cors';
import { scheduleJob } from 'node-schedule';
import { Client } from 'botpanel.js';
import giveawayUtil from '../../util/GiveawayUtil.js';
import randomChannelNames from '../../resources/random-channel-names.json' with { type: 'json' };
import * as discordTranscripts from 'discord-html-transcripts-v2';
const { BotPanelID, BotPanelSecret, Port, economySettings, ticketSettings, panelSectionAliases } = pkg;
const { mergeWinnerHistory, selectGiveawayWinners } = giveawayUtil;

const normalizePanelSection = (section) =>
  panelSectionAliases[
    String(section || 'settings')
      .toLowerCase()
      .replace(/[^a-z]/g, '')
  ];

export async function run(client) {
  client.user.setActivity(
    `${client.settings.get('default').prefix}help | ${client.guilds.cache.size.toLocaleString()} Servers`,
  );

  client.logger.log(`${client.user.tag}, ready to serve ${client.guilds.cache.size.toLocaleString()} guilds.`, 'ready');

  for (const [, guild] of client.guilds.cache) {
    try {
      // This fetches all members and stores them in guild.members.cache
      await guild.members.fetch();
    } catch (err) {
      console.error(`❌ Failed to fetch members for ${guild.name}:`, err);
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  if (BotPanelID?.length > 0 && BotPanelSecret?.length > 0) {
    const BotPanelClient = new Client({
      id: BotPanelID,
      secret: BotPanelSecret,
      wss: 'wss://wss-staging.discordbotpanel.com',
    });

    BotPanelClient.on('GUILD_INTERACTION', async (interaction) => {
      const isBotInGuild = client.guilds.cache.has(interaction.guildId);
      let guildData = {};
      const textChannels = [];
      const voiceChannels = [];
      const categories = [];
      let roles = [];

      if (isBotInGuild) {
        const possibleChannels = ['textChannels', 'voiceChannels', 'categories'];
        const channelTypes = {
          [ChannelType.GuildText]: textChannels,
          [ChannelType.GuildVoice]: voiceChannels,
          [ChannelType.GuildCategory]: categories,
        };

        const [economyRows] = await client.db.execute(
          /* sql */ `
            SELECT
              *
            FROM
              economy_settings
            WHERE
              server_id = ?
          `,
          [interaction.guildId],
        );
        const economySettingsData = economyRows[0] || {};

        const [ticketRows] = await client.db.execute(
          /* sql */ `
            SELECT
              *
            FROM
              ticket_settings
            WHERE
              server_id = ?
          `,
          [interaction.guildId],
        );
        const ticketSettingsData = ticketRows[0] || {};

        guildData = {
          ...client.getSettings(interaction.guildId),
          ...Object.fromEntries(
            Object.entries(economySettings).map(([name, definition]) => [
              name,
              economySettingsData[name] ?? definition.default,
            ]),
          ),
          ...Object.fromEntries(
            Object.entries(ticketSettings).map(([name, definition]) => [
              name,
              ticketSettingsData[name] ?? definition.default,
            ]),
          ),
        };

        interaction.requestedElements.some((i) => possibleChannels.includes(i))
          ? client.channels.cache
              .filter((c) => c.guild.id === interaction.guildId)
              .forEach(({ id, name, position, type }) => {
                const data = { id, name, position };
                const channelType = channelTypes[type];
                if (channelType) channelType.push(data);
              })
          : [];

        roles = interaction.requestedElements.includes('roles')
          ? client.guilds.cache.get(interaction.guildId).roles.cache.map(({ id, name, position, managed }) => {
              return { id, name, position, managed };
            })
          : [];
      }

      interaction.send({
        inGuild: isBotInGuild,
        data: guildData || {},
        textChannels,
        voiceChannels,
        categories,
        roles,
      });
    });

    BotPanelClient.on('MODIFY_GUILD_DATA', async (interaction) => {
      const {
        guildId,
        input: { section, name, value },
      } = interaction;
      const rawValue = Array.isArray(value) ? value.join(',') : value;

      if (rawValue === undefined || rawValue === null || String(rawValue).trim().length < 1)
        return interaction.acknowledge({
          success: false,
          message: 'Please provide a value.',
        });

      const sectionKey = normalizePanelSection(section);

      if (sectionKey === 'default') {
        const defaults = client.settings.get('default') || {};
        if (!Object.hasOwn(defaults, name)) {
          return interaction.acknowledge({ success: false, message: 'Invalid setting name.' });
        }

        await client.setGuildSetting(guildId, name, String(rawValue));
      } else if (sectionKey === 'economy') {
        const definition = economySettings[name];
        if (!Object.hasOwn(economySettings, name)) {
          return interaction.acknowledge({ success: false, message: 'Invalid economy setting name.' });
        }

        let newValue;
        if (definition.type === 'number') {
          newValue = Number(rawValue);
          if (!Number.isInteger(newValue) || newValue < definition.min || newValue > definition.max) {
            return interaction.acknowledge({
              success: false,
              message: `Enter a whole number between ${definition.min} and ${definition.max}.`,
            });
          }
        } else {
          newValue = String(rawValue).trim();
          if (newValue.length > definition.maxLength) {
            return interaction.acknowledge({
              success: false,
              message: `Value must be ${definition.maxLength} characters or fewer.`,
            });
          }
        }

        await client.db.execute(
          /* sql */ `
            INSERT INTO economy_settings (server_id, \`${name}\`)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE \`${name}\` = VALUES(\`${name}\`)
          `,
          [guildId, newValue],
        );
      } else if (sectionKey === 'tickets') {
        const definition = ticketSettings[name];
        if (!Object.hasOwn(ticketSettings, name)) {
          return interaction.acknowledge({ success: false, message: 'Invalid ticket setting name.' });
        }

        let newValue;
        if (definition.type === 'number') {
          newValue = Number(rawValue);
          if (!Number.isInteger(newValue) || newValue < definition.min || newValue > definition.max) {
            return interaction.acknowledge({
              success: false,
              message: `Enter a whole number between ${definition.min} and ${definition.max}.`,
            });
          }
        } else {
          newValue = String(rawValue).trim();
          if (newValue.length > definition.maxLength) {
            return interaction.acknowledge({
              success: false,
              message: `Value must be ${definition.maxLength} characters or fewer.`,
            });
          }
        }

        await client.db.execute(
          /* sql */ `
            INSERT INTO ticket_settings (server_id, \`${name}\`)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE \`${name}\` = VALUES(\`${name}\`)
          `,
          [guildId, newValue],
        );
      } else {
        return interaction.acknowledge({ success: false, message: 'Unknown settings section.' });
      }

      await interaction.acknowledge({
        success: true,
        message: `Successfully set ${name} to ${Array.isArray(value) ? value.join(',') : value}`,
      });
    });

    BotPanelClient.login();
    client.botPanelClient = BotPanelClient;
    console.log('✅ Successfully logged in to BotPanel');
  }

  // Web server
  if (Port) {
    const app = express();
    app.use(express.json());
    app.use(cors());

    app.get('/api/data', (req, res) => {
      const commands = client.commands.reduce((acc, command) => {
        const category = command.help.category;
        if (!acc[category]) acc[category] = {};

        acc[category][command.help.name] = {
          description: command.help.description,
          usage: command.help.usage,
          examples: command.help.examples,
          aliases: command.conf.aliases,
          permissionLevel: command.conf.permLevel,
          guildOnly: command.conf.guildOnly,
          nsfw: command.conf.nsfw,
          longDescription: command.help.longDescription || 'No long description provided.',
        };

        return acc;
      }, {});

      res.json({ commands });
    });

    app.listen(Port, () => {
      console.log(`Web server running at http://localhost:${Port}`);
    });
  }

  // Delete server data scheduler (every day at midnight) after 30 days of leaving
  scheduleJob('DeleteServerData', '0 0 * * *', async () => {
    if (!client.db) return;

    const thirtyDaysInMs = 2592000000;
    const cutoffTimestamp = Date.now() - thirtyDaysInMs;

    try {
      // 1. Identify which servers need to be deleted first
      // This handles the filtering at the database level instead of in Node.js memory
      const [expiredServers] = await client.db.execute(
        /* sql */
        `
          SELECT
            server_id
          FROM
            server_settings
          WHERE
            leave_timestamp <= ?
        `,
        [cutoffTimestamp],
      );

      if (expiredServers.length === 0) return;

      const serverIds = expiredServers.map((row) => row.server_id);

      // 2. Get all tables that contain a 'server_id' column once
      const [tables] = await client.db.execute(/* sql */ `
        SELECT DISTINCT
          TABLE_NAME
        FROM
          INFORMATION_SCHEMA.COLUMNS
        WHERE
          COLUMN_NAME = 'server_id'
          AND TABLE_SCHEMA = DATABASE ()
      `);

      // 3. Perform bulk deletes
      // We use WHERE server_id IN (...) to delete data for all expired servers at once
      const idList = serverIds.map(() => '?').join(',');

      for (const { TABLE_NAME } of tables) {
        await client.db.execute(/* sql */ `DELETE FROM \`${TABLE_NAME}\` WHERE server_id IN (${idList})`, serverIds);
      }

      // 4. Clean up the local cache
      for (const serverId of serverIds) {
        await client.deleteGuildSettings(serverId);
      }

      client.logger.log(`Bulk deleted MySQL data for ${serverIds.length} servers.`);
    } catch (error) {
      client.logger.error('Error in DeleteServerData scheduler:', error);
    }
  });

  // Reminder scheduler
  scheduleJob('Reminders', '* * * * *', async () => {
    if (!client.db) return;

    try {
      const [reminders] = await client.db.execute(
        /* sql */
        `
          SELECT
            reminder_id AS reminderID,
            created_at AS createdAt,
            trigger_on,
            reminder_text AS reminderText,
            channel_id AS channelID,
            user_id AS userID,
            color,
            direct_message AS directMessage,
            guild_id AS guildID,
            original_message_id AS originalMessageID
          FROM
            reminders
          WHERE
            trigger_on <= ?
        `,
        [Date.now()],
      );

      for (const r of reminders) {
        const {
          reminderID,
          createdAt,
          reminderText,
          channelID,
          userID,
          color,
          directMessage,
          guildID,
          originalMessageID,
        } = r;

        try {
          const user = await client.users.fetch(userID).catch(() => null);
          if (!user) continue;

          const embed = new EmbedBuilder()
            .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
            .setColor(color)
            .addFields([{ name: 'Reminder', value: `\`\`\`${reminderText}\`\`\`` }])
            .setFooter({ text: 'You created this reminder @' })
            .setTimestamp(createdAt);

          const components = [];

          // Only try to add the "Jump" button if it's from a guild
          if (guildID && originalMessageID) {
            let channel = client.channels.cache.get(channelID);
            if (!channel) {
              channel = await client.channels.fetch(channelID).catch(() => null);
            }

            if (channel) {
              const originalMsg = await channel.messages.fetch(originalMessageID).catch(() => null);

              if (originalMsg) {
                components.push(
                  new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setLabel('Jump to Message').setStyle(ButtonStyle.Link).setURL(originalMsg.url),
                  ),
                );
              } else {
                components.push(
                  new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                      .setCustomId('message_unavailable')
                      .setLabel('Original Message Unavailable')
                      .setStyle(ButtonStyle.Secondary)
                      .setDisabled(true),
                  ),
                );
              }
            } else {
              components.push(
                new ActionRowBuilder().addComponents(
                  new ButtonBuilder()
                    .setCustomId('channel_unavailable')
                    .setLabel('Original Channel Unavailable')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                ),
              );
            }
          }

          if (directMessage) {
            await user.send({ embeds: [embed], content: `${user.username}, here's your reminder:`, components });
          } else {
            let channel = client.channels.cache.get(channelID);
            if (!channel) {
              channel = await client.channels.fetch(channelID).catch(() => null);
            }

            if (channel) {
              await channel
                .send({ embeds: [embed], content: `<@${userID}>, here's your reminder:`, components })
                .catch(() => {
                  user.send({ embeds: [embed], content: `${user.username}, here's your reminder:`, components });
                });
            } else {
              await user.send({ embeds: [embed], content: `${user.username}, here's your reminder:`, components });
            }
          }

          await client.db.execute(
            /* sql */ `
              DELETE FROM reminders
              WHERE
                reminder_id = ?
            `,
            [reminderID],
          );
        } catch (err) {
          console.error(`Error sending reminder ${reminderID}:`, err);
        }
      }
    } catch (err) {
      console.error('Error checking reminders:', err);
    }
  });

  // Delete expired items scheduler
  scheduleJob('DeleteExpiredItems', '* * * * *', async () => {
    if (!client.db) return;

    try {
      const now = Date.now();

      // 1. Delete expired items from the STORE
      await client.db.execute(
        /* sql */ `
          DELETE FROM economy_store
          WHERE
            time_remaining IS NOT NULL
            AND time_remaining <= ?
        `,
        [now],
      );
    } catch (err) {
      console.error('[Scheduler Error] Failed to delete expired items:', err);
    }
  });

  // Giveaway winner selection scheduler
  scheduleJob('GiveawayWinners', '* * * * *', async () => {
    if (!client.db) return;

    try {
      const now = Date.now();

      const [endedGiveaways] = await client.db.execute(
        /* sql */ `
          SELECT
            *
          FROM
            giveaways
          WHERE
            end_at <= ?
            AND status = 'active'
        `,
        [now],
      );

      for (const giveaway of endedGiveaways) {
        try {
          const channel = await client.channels.fetch(giveaway.channel_id).catch(() => null);
          if (!channel) {
            console.warn(
              `Channel ${giveaway.channel_id} not found for giveaway ${giveaway.message_id}. Marking as ended without sending results.`,
            );
            await client.db.execute(
              /* sql */ `
                UPDATE giveaways
                SET
                  status = 'ended'
                WHERE
                  server_id = ?
                  AND message_id = ?
              `,
              [giveaway.server_id, giveaway.message_id],
            );
            continue;
          }

          const message = await channel.messages.fetch(giveaway.message_id).catch(() => null);
          if (!message) {
            console.warn(
              `Message ${giveaway.message_id} not found in channel ${giveaway.channel_id} for giveaway ${giveaway.message_id}. Marking as ended without sending results.`,
            );
            await client.db.execute(
              /* sql */ `
                UPDATE giveaways
                SET
                  status = 'ended'
                WHERE
                  server_id = ?
                  AND message_id = ?
              `,
              [giveaway.server_id, giveaway.message_id],
            );
            continue;
          }

          const [entriesResult] = await client.db.execute(
            /* sql */ `
              SELECT
                user_id
              FROM
                giveaway_entries
              WHERE
                message_id = ?
                AND server_id = ?
            `,
            [giveaway.message_id, giveaway.server_id],
          );

          const entryCount = entriesResult.length;
          const entryUserIds = entriesResult.map((row) => row.user_id);
          const { winners } = selectGiveawayWinners(entryUserIds, [], giveaway.winner_count);
          const winnerHistory = mergeWinnerHistory([], winners);

          await client.db.execute(
            /* sql */ `
              UPDATE giveaways
              SET
                status = 'ended',
                winners = ?,
                winner_history = ?
              WHERE
                server_id = ?
                AND message_id = ?
            `,
            [JSON.stringify(winners), JSON.stringify(winnerHistory), giveaway.server_id, giveaway.message_id],
          );

          const embed = EmbedBuilder.from(message.embeds[0]).setFields([
            {
              name: '🎁 Giveaway Information',
              value: `**Ended:** <t:${Math.floor(giveaway.end_at / 1000)}:R>\n**Hosted by:** <@${giveaway.host_id}>${giveaway.required_role ? `\n**Required Role:** <@&${giveaway.required_role}>` : ''}`,
            },
          ]);

          const disabledButton = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('giveaway_enter')
              .setLabel(`Enter (${entryCount})`)
              .setEmoji('🎉')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(true),
          );

          await message.edit({ embeds: [embed], components: [disabledButton] });

          if (winners.length > 0) {
            const winnerMentions = winners.map((id) => `<@${id}>`).join(', ');
            await message.reply(`Congratulations ${winnerMentions}! You won the **${giveaway.prize}** giveaway!`);
          } else {
            await message.reply('The giveaway has ended, but there were no entries.');
          }
        } catch (err) {
          console.error(`Error ending giveaway ${giveaway.message_id}:`, err);
        }
      }
    } catch (err) {
      console.error('Error checking for ended giveaways:', err);
    }
  });

  // Honeypot Channel Rename (every day at midnight)
  scheduleJob('honeypotChannelRename', '0 0 * * *', async () => {
    if (!client.db) return;

    try {
      const [honeyRows] = await client.db.execute(/* sql */ `
        SELECT
          *
        FROM
          honeypots
      `);

      for (const honeypot of honeyRows) {
        const existingOptions = (() => {
          if (Array.isArray(honeypot?.options)) return honeypot.options;
          if (typeof honeypot?.options === 'string') {
            try {
              const parsed = JSON.parse(honeypot.options);
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return [];
            }
          }
          return [];
        })();

        const isChaos = existingOptions.includes('random-channel-name-chaos');

        if (honeypot.action === 'disabled') continue;
        if (!honeypot.channel_id) continue;

        let newName = 'honeypot';

        if (isChaos) {
          const length = Math.floor(Math.random() * 20) + 7;
          newName = '';
          const chars = 'abcdefghijklmnopqrstuvwxyz0123456789-';
          for (let i = 0; i < length; i++) {
            newName += chars.charAt(Math.floor(Math.random() * chars.length));
          }
        } else {
          newName = randomChannelNames[Math.floor(Math.random() * randomChannelNames.length)];
        }

        let existingChannel = client.channels.cache.get(honeypot.channel_id);
        if (!existingChannel) {
          // If the channel is not in cache, try fetching it
          existingChannel = await client.channels.fetch(honeypot.channel_id).catch(() => null);
          if (!existingChannel) {
            await client.db.execute(
              /* sql */ `
                UPDATE honeypots
                SET
                  channel_id = NULL,
                  action = 'disabled'
                WHERE
                  server_id = ?
              `,
              [honeypot.server_id],
            );
            continue;
          }
        }

        try {
          await existingChannel.setName(newName, `Honeypot random channel name option${isChaos ? ' (chaos)' : ''}`);
        } catch (err) {
          console.error(
            `Failed to rename honeypot channel ${honeypot.channel_id} in server ${honeypot.server_id}:`,
            err,
          );
        }

        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    } catch (err) {
      console.error('Failure in Honeypot Channel Renamer:', err);
    }
  });

  scheduleJob('CloseTicketCleanup', '0 * * * *', async () => {
    if (!client.db) return;

    const twentyFourHoursInMs = 86400000;
    const cutoffTimestamp = Date.now() - twentyFourHoursInMs;

    try {
      const [closedTickets] = await client.db.execute(
        /* sql */ `
          SELECT
            server_id,
            channel_id,
            user_id,
            close_reason
          FROM
            user_tickets
          WHERE
            closed_at IS NOT NULL
            AND closed_at <= FROM_UNIXTIME (?)
        `,
        [Math.floor(cutoffTimestamp / 1000)],
      );

      if (closedTickets.length === 0) return;

      for (const ticket of closedTickets) {
        try {
          const guild = client.guilds.cache.get(ticket.server_id);
          if (!guild) {
            await client.db.execute(
              /* sql */ `
                DELETE FROM user_tickets
                WHERE
                  server_id = ?
                  AND channel_id = ?
              `,
              [ticket.server_id, ticket.channel_id],
            );
            continue;
          }

          const ticketChannel = guild.channels.cache.get(ticket.channel_id);
          if (!ticketChannel) {
            await client.db.execute(
              /* sql */ `
                DELETE FROM user_tickets
                WHERE
                  server_id = ?
                  AND channel_id = ?
              `,
              [ticket.server_id, ticket.channel_id],
            );
            continue;
          }

          const [settingsRows] = await client.db.execute(
            /* sql */ `
              SELECT
                *
              FROM
                ticket_settings
              WHERE
                server_id = ?
            `,
            [ticket.server_id],
          );

          if (settingsRows.length === 0) {
            await client.db.execute(
              /* sql */ `
                DELETE FROM user_tickets
                WHERE
                  server_id = ?
                  AND channel_id = ?
              `,
              [ticket.server_id, ticket.channel_id],
            );
            continue;
          }

          const loggingID = settingsRows[0]?.logging_id;
          const loggingChannel = guild.channels.cache.get(loggingID);

          if (loggingChannel) {
          }

          let transcriptURL;
          let transcriptAttachment = null;
          try {
            const transcript = await discordTranscripts.createTranscript(ticketChannel, {
              returnType: 'string',
              poweredBy: false,
            });

            if (client.botPanelClient?.connected) {
              transcriptURL = await client.botPanelClient.uploadTranscript(ticket.server_id, transcript);
            } else {
              transcriptAttachment = new AttachmentBuilder(Buffer.from(transcript, 'utf-8'), {
                name: `transcript-${ticket.channel_id}.html`,
              });
            }
          } catch (err) {
            console.error(
              `Failed to create transcript for ticket ${ticket.channel_id} in server ${ticket.server_id}:`,
              err,
            );
            transcriptURL = null;
          }

          let received = true;
          const ticketOwner = await client.users.fetch(ticket.user_id).catch(() => {
            received = false;
          });
          const guildSettings = client.getSettings(ticket.server_id);

          let components = [];
          let files = [];
          if (transcriptURL) {
            const linkButton = new ButtonBuilder()
              .setLabel('View Transcript')
              .setStyle(ButtonStyle.Link)
              .setURL(transcriptURL);
            components.push(new ActionRowBuilder().addComponents(linkButton));
          } else if (transcriptAttachment) {
            files.push(transcriptAttachment);
          }

          if (ticketOwner) {
            const userEmbed = new EmbedBuilder()
              .setTitle('Ticket Closed & Archived')
              .setColor(guildSettings.embedColor)
              .setDescription('Your ticket has been archived and the channel has been deleted.')
              .addFields([
                { name: 'Server', value: ticketChannel.guild.name, inline: false },
                { name: 'Close Reason', value: ticket.close_reason || 'No reason specified', inline: false },
                {
                  name: 'Transcript',
                  value: `[View Transcript](${transcriptURL})`,
                  inline: false,
                },
              ])
              .setTimestamp();

            await ticketOwner.send({ embeds: [userEmbed], files, components }).catch(() => {
              received = false;
            });
          }

          if (loggingChannel) {
            const logEmbed = new EmbedBuilder()
              .setAuthor({ name: ticketOwner?.displayName, iconURL: ticketOwner?.displayAvatarURL() })
              .setTitle('Ticket Deleted by Owner/Support')
              .setColor(guildSettings.embedColor)
              .addFields([
                { name: 'Author', value: `<@${ticketOwner?.id}> (${ticketOwner})`, inline: false },
                { name: 'Channel', value: `${ticketChannel.name}: ${ticketChannel.id}`, inline: false },
                { name: 'Close Reason', value: ticket.close_reason || 'No reason specified', inline: false },
              ])
              .setTimestamp();

            if (!received) {
              logEmbed.addFields([
                {
                  name: 'Notice',
                  value: 'Failed to send message to ticket owner.',
                  inline: false,
                },
              ]);
            }
            await loggingChannel.send({ embeds: [logEmbed], files, components }).catch(() => {});
          }

          await ticketChannel.delete().catch(() => {});

          await client.db.execute(
            /* sql */ `
              DELETE FROM user_tickets
              WHERE
                server_id = ?
                AND channel_id = ?
            `,
            [ticket.server_id, ticket.channel_id],
          );
        } catch (err) {
          console.error(`Error processing closed ticket ${ticket.channel_id} in server ${ticket.server_id}:`, err);
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (err) {
      console.error('Failure in Close Ticket Cleanup job:', err);
    }
  });
}
