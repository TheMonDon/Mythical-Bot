import pkg from '../../config.js';
import { EmbedBuilder, ChannelType } from 'discord.js';
import { QuickDB } from 'quick.db';
import express from 'express';
import cors from 'cors';
import { scheduleJob } from 'node-schedule';
import { Client } from 'botpanel.js';
const { BotPanelID, BotPanelSecret, Port } = pkg;
const db = new QuickDB();

export async function run(client) {
  if (!client.settings.has('default')) {
    if (!client.config.defaultSettings)
      throw new Error('defaultSettings not preset in config.js or settings database. Bot cannot load.');
    client.settings.set('default', client.config.defaultSettings);
  }

  client.user.setActivity(`${client.settings.get('default').prefix}help | ${client.guilds.cache.size} Servers`);

  client.games.clear();
  client.logger.log(`${client.user.tag}, ready to serve ${client.guilds.cache.size} guilds.`, 'ready');

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
    const connection = await client.db.getConnection();
    const [settingsRows] = await connection.execute(/* sql */ `
      SELECT
        server_id
      FROM
        server_settings
      WHERE
        leave_timestamp IS NOT NULL
    `);

    if (settingsRows.length) {
      const serverIds = settingsRows.map((row) => row.server_id);
      for (const serverId of serverIds) {
        const [timestampRows] = await connection.execute(
          /* sql */
          `
            SELECT
              leave_timestamp
            FROM
              server_settings
            WHERE
              server_id = ?
          `,
          [serverId],
        );

        const leaveTimestamp = timestampRows[0]?.leave_timestamp;
        if (!leaveTimestamp) continue;

        const timeDiff = Date.now() - leaveTimestamp;
        if (timeDiff >= 2592000000) {
          const [tables] = await connection.execute(/* sql */
          `
            SELECT
              TABLE_NAME
            FROM
              INFORMATION_SCHEMA.COLUMNS
            WHERE
              COLUMN_NAME = 'server_id'
              AND TABLE_SCHEMA = DATABASE ()
          `);

          for (const { TABLE_NAME } of tables) {
            await connection.execute(`DELETE FROM \`${TABLE_NAME}\` WHERE server_id = ?`, [serverId]);
          }

          client.settings.delete(serverId);
          client.logger.log(`Deleted mysql server data for ${serverId}`);
        }
      }
      connection.release();
    }

    const quickDbServers = (await db.get('servers')) || {};

    // Leave in until complete migration
    if (quickDbServers) {
      for (const [serverId] of Object.entries(quickDbServers)) {
        const leaveTimestamp = await db.get(`servers.${serverId}.leave_timestamp`);
        if (leaveTimestamp) {
          const timeDiff = Date.now() - leaveTimestamp;
          if (timeDiff >= 2592000000) {
            await db.delete(`servers.${serverId}`);

            client.settings.delete(serverId);
            client.logger.log(`Deleted quickdb server data for ${serverId}.`);
          }
        }
      }
    }
  });

  // Reminder scheduler
  scheduleJob('Reminders', '* * * * *', async () => {
    const reminders = (await db.get('global.reminders')) || [];

    if (reminders) {
      for (const { createdAt, triggerOn, reminder, channelID, userID, color, remID } of Object.values(reminders)) {
        const now = Date.now();

        if (triggerOn <= now) {
          try {
            const channel = client.channels.cache.get(channelID);
            const user = await client.users.fetch(userID);
            if (!user) return;

            const em = new EmbedBuilder()
              .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
              .setColor(color)
              .addFields([{ name: 'Reminder', value: `\`\`\`${reminder}\`\`\`` }])
              .setFooter({ text: 'You created this reminder @' })
              .setTimestamp(createdAt);
            channel
              ? channel.send({ embeds: [em], content: `<@${userID}>, here's your reminder:` }).catch((_error) => {
                  user.send({ embeds: [em], content: `${user.username}, here's your reminder:` });
                })
              : user.send({ embeds: [em], content: `${user.username}, here's your reminder:` });

            await db.delete(`global.reminders.${remID}`);
          } catch (err) {
            console.error(err);
          }
        }
      }
    }
  });

  // Delete expired items scheduler
  scheduleJob('DeleteExpiredItems', '* * * * *', async () => {
    const servers = (await db.get('servers')) || {};

    for (const [serverId, serverData] of Object.entries(servers)) {
      const store = serverData?.economy?.store || {};
      let updated = false;

      for (const [itemName, itemData] of Object.entries(store)) {
        if (itemData.timeRemaining && itemData.timeRemaining <= Date.now()) {
          delete store[itemName]; // Remove expired item
          updated = true;
        }
      }

      // Save only if an item was deleted
      if (updated) {
        await db.set(`servers.${serverId}.economy.store`, store);
      }
    }
  });
}
