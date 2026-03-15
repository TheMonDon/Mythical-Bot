import pkg from '../../config.js';
import { EmbedBuilder, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { QuickDB } from 'quick.db';
import express from 'express';
import cors from 'cors';
import { scheduleJob } from 'node-schedule';
import { Client } from 'botpanel.js';
const { BotPanelID, BotPanelSecret, Port } = pkg;
const db = new QuickDB();

export async function run(client) {
  if (!client.settings.has('default')) {
    if (!client.config.defaultSettings) {
      throw new Error('defaultSettings not preset in config.js or settings database. Bot cannot load.');
    }

    client.settings.set('default', client.config.defaultSettings);
  }

  client.user.setActivity(`${client.settings.get('default').prefix}help | ${client.guilds.cache.size} Servers`);

  client.games.clear();
  client.logger.log(`${client.user.tag}, ready to serve ${client.guilds.cache.size} guilds.`, 'ready');

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
    const BotPanelClient = new Client({ id: BotPanelID, secret: BotPanelSecret });

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

        const settings = (await client.settings.get(interaction.guildId)) || {};
        const defaults = await client.settings.get('default');
        if (Object.keys(settings).length !== Object.keys(defaults).length) {
          for (const key in defaults) {
            if (!settings[key]) settings[key] = defaults[key];
          }
        }

        guildData = settings;

        // eslint-disable-next-line no-unused-expressions
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
        input: { name, value },
      } = interaction;
      const defaultSettings = await client.settings.get('default');
      const guildSettings = await client.settings.get(guildId);

      if (!defaultSettings[name])
        return interaction.acknowledge({
          success: false,
          message: 'Invalid setting name.',
        });
      if (value.length < 1)
        return interaction.acknowledge({
          success: false,
          message: 'Please provide a value.',
        });
      const newValue = Array.isArray(value) ? value.join(',') : value;
      if (!guildSettings) {
        await client.settings.set(guildId, {
          ...defaultSettings,
          [name]: newValue,
        });
      } else {
        await client.settings.set(guildId, { ...guildSettings, [name]: newValue });
      }

      interaction.acknowledge({
        success: true,
        message: `Successfully set ${name} to ${newValue}`,
      });
    });

    BotPanelClient.login();
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
        client.settings.delete(serverId);
      }

      client.logger.log(`Bulk deleted MySQL data for ${serverIds.length} servers.`);
    } catch (error) {
      client.logger.error('Error in DeleteServerData scheduler:', error);
    }
  });

  // Reminder scheduler
  scheduleJob('Reminders', '* * * * *', async () => {
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
                      .setLabel('Message Unavailable')
                      .setStyle(ButtonStyle.Secondary)
                      .setDisabled(true),
                  ),
                );
              }
            } else {
              components.push(
                new ActionRowBuilder().addComponents(
                  new ButtonBuilder().setLabel('Channel Unavailable').setStyle(ButtonStyle.Secondary).setDisabled(true),
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
    try {
      const now = Date.now();

      // 1. Delete expired items from the STORE
      await this.client.db.execute(
        'DELETE FROM economy_store WHERE time_remaining IS NOT NULL AND time_remaining <= ?',
        [now],
      );
    } catch (err) {
      console.error('[Scheduler Error] Failed to delete expired items:', err);
    }
  });
}
