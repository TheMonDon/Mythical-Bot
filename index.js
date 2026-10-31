const {
  GatewayIntentBits,
  Collection,
  Client,
  EmbedBuilder,
  Partials,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');
const { LavalinkManager } = require('lavalink-client');
const { readdirSync, statSync } = require('fs');
const config = require('./config.js');
const { Duration } = require('luxon');
const path = require('path');

const normalizeLavalinkNodes = (nodes) =>
  nodes.map((node) => ({
    requestSignalTimeoutMS: 30_000,
    ...node,
  }));

class Bot extends Client {
  constructor(options) {
    super(options);

    this.config = config;
    this.commands = new Collection();
    this.aliases = new Collection();
    this.slashCommands = new Collection();
    this.util = require('./util/Util.js');

    this.settings = new Map();
    this.pauseTimeouts = new Map();

    this.logger = require('./util/Logger.js');

    // PERMISSION LEVEL DEFINITIONS
    this.permLevels = [
      {
        level: 0,
        name: 'User',
        checkPermissions: () => true,
      },
      {
        level: 1,
        name: 'Supporter',
        checkPermissions: async (context) => {
          // Check if the server is a supporter server in the database
          const [serverRows] = await context.client.db.execute(
            /* sql */ `
              SELECT
                premium
              FROM
                server_settings
              WHERE
                server_id = ?
            `,
            [context.guild ? context.guild.id : context.channel.guild.id],
          );

          // Check if the user has a premium status in the database
          const [userRows] = await context.client.db.execute(
            /* sql */ `
              SELECT
                premium
              FROM
                user_settings
              WHERE
                user_id = ?
            `,
            [context.user ? context.user.id : context.author.id],
          );

          return serverRows?.[0]?.premium === true || userRows?.[0]?.premium === true;
        },
      },
      {
        level: 2,
        name: 'Moderator',
        checkPermissions: (context) => {
          try {
            const modRole = this.util.getRole(context, context.settings.modRole);
            if (!modRole) return false;
            if (context.member.roles.cache.has(modRole.id)) return true;
            if (context.member.roles.highest.position > modRole.position) return true;
          } catch (e) {
            return false;
          }
        },
      },
      {
        level: 3,
        name: 'Administrator',
        checkPermissions: (context) => {
          try {
            if (context.member.permissions.has('Administrator')) return true;
            const adminRole = this.util.getRole(context, context.settings.adminRole);
            if (!adminRole) return false;
            if (context.member.roles.cache.has(adminRole.id)) return true;
            if (context.member.roles.highest.position > adminRole.position) return true;
          } catch (e) {
            return false;
          }
        },
      },
      {
        level: 4,
        name: 'Server Owner',
        checkPermissions: (context) => {
          try {
            return context.guild.ownerId === (context.user ? context.user.id : context.author.id);
          } catch (e) {
            return false;
          }
        },
      },
      {
        level: 8,
        name: 'Bot Support',
        checkPermissions: (context) => {
          return config.support.includes(context.user ? context.user.id : context.author.id);
        },
      },
      {
        level: 9,
        name: 'Bot Admin',
        checkPermissions: (context) => {
          return config.admins.includes(context.user ? context.user.id : context.author.id);
        },
      },
      {
        level: 10,
        name: 'Bot Owner',
        checkPermissions: (context) => {
          return config.owners.includes(context.user ? context.user.id : context.author.id);
        },
      },
    ];
  }

  // PERMISSION LEVEL FUNCTION
  async permlevel(object) {
    let permlvl = 0;

    const permOrder = this.permLevels.slice(0).sort((p, c) => (p.level < c.level ? 1 : -1));

    while (permOrder.length) {
      const currentLevel = permOrder.shift();
      if (object.guild && currentLevel.guildOnly) continue;
      if (await currentLevel.checkPermissions(object)) {
        permlvl = currentLevel.level;
        break;
      }
    }
    return permlvl;
  }

  /*
  COMMAND LOAD AND UNLOAD

  To simplify the loading and unloading of commands from multiple locations
  including the index.js load loop, and the reload function, these 2 ensure
  that unloading happens in a consistent manner across the board.
  */

  loadInteraction(interactionPath, interactionName) {
    try {
      const props = require(interactionPath);
      props.conf.location = interactionPath;
      this.slashCommands.set(props.commandData.name, props);
      return false;
    } catch (e) {
      return console.log(`Unable to load slash command ${interactionName}:`, e);
    }
  }

  async unloadInteraction(interactionPath, interactionName) {
    let command;
    if (this.slashCommands.has(interactionName)) {
      command = this.slashCommands.get(interactionName);
    }
    if (!command) return console.error(`The slash command \`${interactionName}\` doesn't seem to exist. Try again!`);

    delete require.cache[require.resolve(interactionPath)];
    this.slashCommands.delete(interactionName);
    return false;
  }

  loadCommand(commandPath, commandName) {
    try {
      const props = new (require(commandPath))(this);
      props.conf.location = commandPath;
      this.commands.set(props.help.name, props);
      props.conf.aliases.forEach((alias) => {
        this.aliases.set(alias, props.help.name);
      });
      return false;
    } catch (e) {
      return console.log(`Unable to load command ${commandName}:`, e);
    }
  }

  async unloadCommand(commandPath, commandName) {
    let command;
    if (this.commands.has(commandName)) {
      command = this.commands.get(commandName);
    } else if (this.aliases.has(commandName)) {
      command = this.commands.get(this.aliases.get(commandName));
    }
    if (!command)
      return console.error(`The command \`${commandName}\` doesn't seem to exist, nor is it an alias. Try again!`);

    delete require.cache[require.resolve(commandPath)];
    return false;
  }

  async loadEvent(eventModule, eventName) {
    client.on(eventName, async (...args) => {
      try {
        await eventModule.run(client, ...args);
      } catch (error) {
        console.error(`[ERROR ${new Date().toISOString()}] Error in ${eventName} event:`, error);
      }
    });
  }

  /* SETTINGS FUNCTIONS
  These functions are used by any and all location in the bot that wants to either
  read the current *complete* guild settings (default + overrides, merged) or that
  wants to change settings for a specific guild.
  */

  // getSettings merges the client defaults with the guild settings. guild settings in
  // enmap should only have *unique* overrides that are different from defaults.
  getSettings(guild) {
    const defaults = this.settings.get('default') || {};
    const guildId = typeof guild === 'string' ? guild : guild?.id;
    const guildData = guildId ? this.settings.get(guildId) || {} : {};
    return { ...defaults, ...guildData };
  }

  async loadSettings() {
    const [rows] = await this.db.execute('SELECT setting_id, settings FROM bot_settings');
    this.settings.clear();
    for (const row of rows) {
      this.settings.set(row.setting_id, typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings);
    }

    if (!this.settings.has('default')) {
      if (!this.config.defaultSettings) {
        throw new Error('defaultSettings not preset in config.js or the MySQL settings table.');
      }
      await this.saveSettings('default', this.config.defaultSettings);
    }
  }

  async saveSettings(id, settings) {
    await this.db.execute(
      /* sql */ `
        INSERT INTO
          bot_settings (setting_id, settings)
        VALUES
          (?, ?) ON DUPLICATE KEY
        UPDATE settings =
        VALUES
          (settings)
      `,
      [id, JSON.stringify(settings)],
    );
    this.settings.set(id, settings);
  }

  async setGuildSetting(guildId, key, value) {
    const settings = { ...(this.settings.get(guildId) || {}), [key]: value };
    await this.saveSettings(guildId, settings);
  }

  async deleteGuildSetting(guildId, key) {
    const settings = { ...(this.settings.get(guildId) || {}) };
    delete settings[key];
    await this.saveSettings(guildId, settings);
  }

  async deleteGuildSettings(guildId) {
    await this.db.execute('DELETE FROM bot_settings WHERE setting_id = ?', [guildId]);
    this.settings.delete(guildId);
  }

  async setDefaultSetting(key, value) {
    const defaults = { ...(this.settings.get('default') || {}) };
    defaults[key] = value;
    await this.saveSettings('default', defaults);
  }

  async deleteDefaultSetting(key) {
    const defaults = { ...(this.settings.get('default') || {}) };
    delete defaults[key];
    await this.saveSettings('default', defaults);

    for (const [guildId, settings] of this.settings) {
      if (guildId === 'default' || !Object.hasOwn(settings, key)) continue;
      const updatedSettings = { ...settings };
      delete updatedSettings[key];
      await this.saveSettings(guildId, updatedSettings);
    }
  }
}

// Enable intents for the bot
const client = new Bot({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildExpressions,
    GatewayIntentBits.GuildIntegrations,
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageReactions,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.GuildMember, Partials.User],
});

const loadLavalink = async () => {
  if (!Array.isArray(config.nodes) || config.nodes.length === 0) return;

  client.lavalink = new LavalinkManager({
    nodes: normalizeLavalinkNodes(config.nodes),
    sendToShard: (guildId, payload) => client.guilds.cache.get(guildId)?.shard?.send(payload),
    autoSkip: true,
    client: {
      id: 'PLACEHOLDER', // Will be updated when ready
      username: 'Mythical Bot',
    },
    maxTimeoutMs: 60000,
    playerOptions: {
      applyVolumeAsFilter: false,
      clientBasedPositionUpdateInterval: 150,
      defaultSearchPlatform: 'spsearch',
      volumeDecrementer: 0.75,
      onDisconnect: {
        autoReconnect: true,
        destroyPlayer: false,
      },
      onEmptyQueue: {
        destroyAfterMs: 30_000,
        autoPlayFunction: null,
      },
    },
  });

  // Add node connection logging
  client.lavalink.nodeManager
    .on('connect', (node) => {
      console.log(`Connected to Lavalink node: ${node.id}`);
    })
    .on('disconnect', (node, reason) => {
      console.warn(`Disconnected from Lavalink node: ${node.id}, Reason: ${JSON.stringify(reason)}`);
    })
    .on('error', (node, error) => {
      console.error(`Lavalink node ${node.id} error:`, error);
    })
    .on('reconnecting', (node) => {
      console.warn(`Reconnecting to Lavalink node: ${node.id}`);
    });

  // Set up event handlers
  client.lavalink
    .on('trackStart', async (player, track) => {
      try {
        if (player.repeatMode === 'track') return;

        const durationString = Duration.fromMillis(track.info.duration || 0)
          .shiftTo('years', 'months', 'days', 'hours', 'minutes', 'seconds')
          .toHuman({ maximumFractionDigits: 2, showZeros: false });

        let title = track.info.title;
        if (track.info.sourceName === 'youtube') {
          title = title.replace(/^.*?- */, '');
        }

        const guild = client.guilds.cache.get(player.guildId);
        const requester = guild.members.cache.get(track.requester.id);
        let thumbnailUrl = track.info.artworkUrl;
        if (!thumbnailUrl) {
          // Use youtube image if source is youtube and artworkUrl is missing
          if (track.info.sourceName === 'youtube') {
            thumbnailUrl = `https://img.youtube.com/vi/${track.info.identifier}/maxresdefault.jpg`;
          } else {
            // Fallback to a default image if artworkUrl is missing and source is not youtube
            thumbnailUrl = 'https://i.cisn.xyz/piqe4/BixUhUYA41/raw.png';
          }
        }
        const buffer = await client.util.generateTrackStartCard({
          title,
          artist: track.info.author,
          thumbnailUrl,
          duration: durationString,
          requestedBy: requester.displayName,
          queueLength: player.queue.tracks.length,
          requesterAvatarUrl: requester.displayAvatarURL({ extension: 'png', size: 128 }),
        });
        const [rows] = await client.db.execute(
          /* sql */ `
            SELECT
              *
            FROM
              music_last_track
            WHERE
              server_id = ?
          `,
          [player.guildId],
        );
        const oldmsg = rows[0] || null;

        if (oldmsg !== null) {
          try {
            const channel = client.channels.cache.get(oldmsg.channel_id);
            if (channel) {
              const message = await channel.messages.fetch(oldmsg.message_id).catch(() => null);
              if (message) {
                await message.delete().catch(() => {});
              }
            }
          } catch {
            await client.db.execute(
              /* sql */ `
                DELETE FROM music_last_track
                WHERE
                  server_id = ?
              `,
              [player.guildId],
            );
          }
        }

        // Create the buttons
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('stop_track')
            .setEmoji('<:stop_button:1403460977424470036>')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('pause_resume_track')
            .setEmoji('<:play_pause_button:1403460978640814171>')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('skip_track')
            .setEmoji('<:skip_button:1403460975486701618>')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setLabel('Listen here')
            .setEmoji('<:music_link_button:1403460974027079720>')
            .setURL(track.info.uri)
            .setStyle(ButtonStyle.Link),
        );

        const msg =
          player.textChannelId &&
          (await client.channels.cache
            .get(player.textChannelId)
            ?.send({
              files: [{ attachment: buffer, name: 'now-playing.png' }],
              components: [row],
              flags: MessageFlags.SuppressNotifications,
            })
            .catch(() => null));

        await client.db.execute(
          /* sql */
          `
            INSERT INTO
              music_last_track (server_id, channel_id, message_id)
            VALUES
              (?, ?, ?) ON DUPLICATE KEY
            UPDATE channel_id =
            VALUES
              (channel_id),
              message_id =
            VALUES
              (message_id)
          `,
          [player.guildId, msg.channel.id, msg.id],
        );

        const collector = msg.createMessageComponentCollector({
          filter: (i) => i.guildId === msg.guildId,
          time: 2147483647,
        });

        collector.on('collect', async (interaction) => {
          if (interaction.member.voice?.channelId !== player.voiceChannelId) {
            return interaction.reply({
              content: 'You must be in the same voice channel as the bot to use these buttons.',
              flags: MessageFlags.Ephemeral,
            });
          }

          if (interaction.customId === 'pause_resume_track') {
            await interaction.deferUpdate();

            const em = new EmbedBuilder()
              .setColor(client.getSettings(interaction.guild).embedSuccessColor)
              .setAuthor({ name: interaction.member.displayName, iconURL: interaction.member.displayAvatarURL() });

            if (player.paused) {
              player.resume();
              em.setDescription('<:play_button:1403460972697489569> Music has been resumed.');
            } else {
              player.pause();
              player.autoPaused = false;
              em.setDescription('<:pause_button:1403460971367759872> Music has been paused.');
            }

            await interaction.followUp({ embeds: [em] }).catch(() => {});
          } else if (interaction.customId === 'skip_track') {
            await interaction.deferUpdate();

            const song = player.queue.current;

            const em = new EmbedBuilder()
              .setColor(client.getSettings(interaction.guild).embedSuccessColor)
              .setAuthor({ name: interaction.member.displayName, iconURL: interaction.member.displayAvatarURL() });

            if (player.queue.tracks.length === 0) {
              await player.destroy();
              em.setDescription(
                '<:skip_button:1403460975486701618> Skipped to the next track, but the queue is now empty.',
              );
            } else {
              await player.skip();
            }
            if (song) em.addFields([{ name: 'Skipped Song', value: song.info.title, inline: false }]);

            await interaction.followUp({ embeds: [em] }).catch(() => {});
          } else if (interaction.customId === 'stop_track') {
            await interaction.deferUpdate();

            await player.destroy();

            const em = new EmbedBuilder()
              .setColor(client.getSettings(interaction.guild).embedSuccessColor)
              .setAuthor({ name: interaction.member.displayName, iconURL: interaction.member.displayAvatarURL() })
              .setDescription('<:stop_button:1403460977424470036> All music has been stopped.');

            await interaction.followUp({ embeds: [em] }).catch(() => {});
          }
        });
      } catch (error) {
        console.error(error);
      }
    })
    .on('queueEnd', (player) => {
      const guild = client.guilds.cache.get(player.guildId);
      const em = new EmbedBuilder()
        .setTitle('⏹️ Queue Ended')
        .setDescription(
          '**Music has been stopped since the queue has no more tracks.**\n\n' +
            `Use \`/music play\` or \`${client.getSettings(guild).prefix}play\` to add more music to the queue!`,
        )
        .setColor(client.getSettings(guild).embedColor)
        .setTimestamp();

      player.textChannelId &&
        client.channels.cache
          .get(player.textChannelId)
          ?.send({ embeds: [em] })
          .catch(() => {});
    })
    .on('playerError', async (player, error) => {
      console.log(`Something went wrong: ${error}`);
      (await player.textChannelId) &&
        client.channels.cache.get(player.textChannelId)?.send(`Something went wrong: ${error}`);
    })
    .on('trackError', async (player, track, error) => {
      console.log(`Track failed: ${error.exception?.message || error.message}`);
      (await player.textChannelId) &&
        client.channels.cache
          .get(player.textChannelId)
          ?.send(`Track failed: ${error.exception?.message || error.message} \nSong: ${track.info.title}`);
    });

  // Handle raw Discord events for voice state updates
  client.on('raw', async (d) => {
    try {
      await client.lavalink.sendRawData(d);
    } catch (error) {
      console.error('Error sending raw data to Lavalink:', error);
    }
  });

  // Initialize lavalink when the bot is ready
  client.once('clientReady', () => {
    // Update client ID now that the bot is ready
    client.lavalink.options.client.id = client.user.id;
    console.log('Initializing Lavalink...');
    client.lavalink.init(client.user);
  });
};

// Reloads the lavalink node config from config.js without restarting the bot.
// - Re-reads config.js (bypassing the require cache) to pick up edits on disk
// - Removes nodes that were removed from (or changed in) config, then recreates them
// - Forces a reconnect for unchanged nodes that aren't currently connected
// - If lavalink init() failed at startup (no node connected), retries init()
const reloadLavalinkNodes = async () => {
  if (!client.lavalink?.nodeManager) throw new Error('Lavalink is not initialized.');
  if (!client.isReady()) throw new Error('Bot is not ready yet (still connecting to Discord).');

  // Invalidate the require cache so edits to config.js get picked up.
  const configPath = require.resolve('./config.js');
  delete require.cache[configPath];
  const newConfig = require(configPath);
  client.config = newConfig;

  const newNodeOptions = normalizeLavalinkNodes(Array.isArray(newConfig.nodes) ? newConfig.nodes : []);
  const nodeManager = client.lavalink.nodeManager;

  // The NodeManager keys nodes by options.id, falling back to host:port.
  const nodeKey = (o) => o.id || `${o.host}:${o.port}`;
  const differs = (a, b) => JSON.stringify(a) !== JSON.stringify(b);

  const summary = { removed: [], created: [], reconnected: [], failed: [] };

  // 1) Remove nodes that are gone from config or whose options changed.
  //    movePlayers = true sends active players to another connected node first.
  for (const [id, node] of [...nodeManager.nodes]) {
    const newOpts = newNodeOptions.find((o) => nodeKey(o) === id);
    const optionsChanged = !newOpts || Object.keys(newOpts).some((k) => differs(node.options?.[k], newOpts[k]));

    if (!optionsChanged) continue;
    try {
      nodeManager.deleteNode(node, true);
      summary.removed.push(id);
    } catch (error) {
      console.error(`Failed to remove lavalink node "${id}" during reload:`, error);
      summary.failed.push(id);
    }
  }

  // 2) Create (and connect) nodes that are missing from the running manager.
  for (const nodeOpts of newNodeOptions) {
    const key = nodeKey(nodeOpts);
    if (nodeManager.nodes.has(key)) continue;
    try {
      const node = nodeManager.createNode(nodeOpts);
      await node.connect();
      summary.created.push(key);
    } catch (error) {
      console.error(`Failed to create/connect lavalink node "${key}":`, error);
      summary.failed.push(key);
    }
  }

  // 3) Force-reconnect unchanged nodes that are currently down.
  for (const node of [...nodeManager.nodes.values()]) {
    if (node.connected) continue;
    try {
      // Same approach the library uses internally (NodeManager.reconnectAll):
      // destroy without deleting from the manager, then reconnect, reusing the
      // old sessionId so existing sessions/players can resume if possible.
      const sessionId = node.sessionId ? `${node.sessionId}` : undefined;
      await node.destroy('Reloading lavalink node config', false);
      await node.connect(sessionId);
      summary.reconnected.push(node.id);
    } catch (error) {
      console.error(`Failed to reconnect lavalink node "${node.id}":`, error);
      summary.failed.push(node.id);
    }
  }

  // 4) If init() never succeeded at startup (initiated only flips true once at
  //    least one node connects), retry it so the manager becomes useable.
  if (!client.lavalink.initiated) {
    try {
      await client.lavalink.init(client.user);
    } catch (error) {
      console.error('Failed to re-run lavalink init during reload:', error);
    }
  }

  const connectedCount = [...nodeManager.nodes.values()].filter((n) => n.connected).length;
  console.log(
    `[Lavalink] Node config reloaded. Removed: ${summary.removed.join(', ') || 'none'} | ` +
      `Created: ${summary.created.join(', ') || 'none'} | ` +
      `Reconnected: ${summary.reconnected.join(', ') || 'none'}` +
      (summary.failed.length ? ` | Failed: ${summary.failed.join(', ')}` : '') +
      ` | Connected nodes: ${connectedCount}`,
  );
  return summary;
};

const loadMysql = async () => {
  if (!config.mysql?.host && !config.mysql?.database) {
    console.error('MySQL configuration is missing. Please provide the necessary MySQL configuration in config.js.');
    process.exit(1);
  }

  const mysql = require('mysql2/promise');

  const tempConn = await mysql.createConnection({
    host: config.mysql.host,
    port: config.mysql.port,
    user: config.mysql.user,
    password: config.mysql.password,
  });

  await tempConn.query(/* sql */ `CREATE DATABASE IF NOT EXISTS ${config.mysql.database}`);
  await tempConn.end();

  const pool = mysql.createPool({
    host: config.mysql.host,
    port: config.mysql.port,
    user: config.mysql.user,
    password: config.mysql.password,
    database: config.mysql.database,
    multipleStatements: true,
    enableKeepAlive: true,
    connectionLimit: 50,
    keepAliveInitialDelay: 10000,
    waitForConnections: true,
    idleTimeout: 60000,
    maxIdle: 10,
  });

  client.db = pool;

  const connection = await pool.getConnection();

  try {
    await connection.execute(/* sql */ `
      CREATE TABLE IF NOT EXISTS bot_settings (
        setting_id VARCHAR(30) NOT NULL,
        settings JSON NOT NULL,
        PRIMARY KEY (setting_id)
      ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
    `);

    // Create tables if they do not exist
    await connection.execute(/* sql */ `
      CREATE TABLE IF NOT EXISTS command_aliases (
        alias_name VARCHAR(100) NOT NULL,
        base_command VARCHAR(100) DEFAULT NULL,
        uses INT DEFAULT 0,
        PRIMARY KEY (alias_name)
      );
    `);

    await connection.execute(/* sql */ `
      CREATE TABLE IF NOT EXISTS command_stats (
        command_name VARCHAR(100) NOT NULL,
        total_runs INT DEFAULT 0,
        text_runs INT DEFAULT 0,
        slash_runs INT DEFAULT 0,
        PRIMARY KEY (command_name)
      );
    `);

    await connection.execute(/* sql */ `
      CREATE TABLE IF NOT EXISTS chatbot_stats (
        id int NOT NULL,
        total_runs int DEFAULT 0,
        PRIMARY KEY (id)
      );
    `);

    await connection.execute(/* sql */ `
      CREATE TABLE IF NOT EXISTS chatbot_daily_stats (
        date date NOT NULL,
        total_runs int DEFAULT 0,
        PRIMARY KEY (date),
        UNIQUE KEY date_UNIQUE (date)
      );
    `);

    const [triggers] = await connection.query(
      /* sql */
      `
        SELECT
          TRIGGER_NAME
        FROM
          information_schema.TRIGGERS
        WHERE
          TRIGGER_SCHEMA = ?
          AND TRIGGER_NAME = ?
      `,
      [config.mysql.database, 'chatbot_stats_AFTER_INSERT'],
    );

    if (triggers.length === 0) {
      await connection.query(/* sql */ `
        CREATE TRIGGER chatbot_stats_AFTER_INSERT
        AFTER UPDATE ON chatbot_stats FOR EACH ROW
        BEGIN INSERT IGNORE INTO chatbot_daily_stats (date, total_runs)
        VALUES
          (CURDATE (), 0);

        UPDATE chatbot_daily_stats
        SET
          total_runs = total_runs + 1
        WHERE
          date = CURDATE ();

        END
      `);
    }

    await connection.execute(/* sql */ `
      CREATE TABLE IF NOT EXISTS ticket_settings (
        server_id VARCHAR(30) PRIMARY KEY,
        ticket_limit INT DEFAULT ${config.ticketSettings.ticket_limit.default || 3},
        role_id VARCHAR(30) DEFAULT NULL,
        category_id VARCHAR(30) DEFAULT NULL,
        logging_id VARCHAR(30) DEFAULT NULL
      );
    `);

    await connection.execute(/* sql */ `
      CREATE TABLE IF NOT EXISTS user_tickets (
        server_id VARCHAR(30) NOT NULL,
        channel_id VARCHAR(30) NOT NULL,
        user_id VARCHAR(30) NOT NULL,
        topic_cooldown BOOLEAN DEFAULT FALSE,
        cooldown_until BIGINT DEFAULT NULL,
        PRIMARY KEY (server_id, channel_id)
      );
    `);

    await connection.execute(/* sql */ `
      CREATE TABLE IF NOT EXISTS music_last_track (
        server_id VARCHAR(30) NOT NULL,
        channel_id VARCHAR(30) NOT NULL,
        message_id VARCHAR(30) NOT NULL,
        PRIMARY KEY (server_id)
      );
    `);

    await connection.execute(/* sql */ `
      CREATE TABLE IF NOT EXISTS server_settings (
        server_id VARCHAR(30) NOT NULL,
        persistent_roles BOOLEAN DEFAULT FALSE,
        premium BOOLEAN DEFAULT FALSE,
        chatbot BOOLEAN DEFAULT FALSE,
        leave_timestamp BIGINT UNSIGNED DEFAULT NULL,
        warn_kick_threshold INT NOT NULL DEFAULT 8,
        warn_ban_threshold INT NOT NULL DEFAULT 10,
        warn_log_channel VARCHAR(30) NULL,
        PRIMARY KEY (server_id)
      );
    `);

    await connection.execute(/* sql */ `
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id BIGINT UNSIGNED NOT NULL,
        premium BOOLEAN DEFAULT FALSE,
        PRIMARY KEY (user_id)
      );
    `);

    await connection.execute(/* sql */ `
      CREATE TABLE IF NOT EXISTS persistent_roles (
        server_id VARCHAR(30) NOT NULL,
        user_id VARCHAR(30) NOT NULL,
        roles JSON,
        PRIMARY KEY (server_id, user_id)
      );
    `);

    await connection.execute(/* sql */ `
      CREATE TABLE IF NOT EXISTS server_blacklists (
        server_id VARCHAR(30) NOT NULL,
        user_id VARCHAR(30) NOT NULL,
        blacklisted BOOLEAN DEFAULT FALSE,
        reason LONGTEXT,
        PRIMARY KEY (server_id, user_id)
      );
    `);

    await connection.execute(/* sql */ `
      CREATE TABLE IF NOT EXISTS global_blacklists (
        user_id VARCHAR(30) NOT NULL,
        blacklisted BOOLEAN DEFAULT FALSE,
        reason LONGTEXT,
        PRIMARY KEY (user_id)
      );
    `);

    await connection.execute(/* sql */ `
      CREATE TABLE IF NOT EXISTS cooldowns (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        server_id VARCHAR(30) NOT NULL,
        user_id VARCHAR(30) NOT NULL,
        cooldown_name VARCHAR(50) NOT NULL,
        expires_at DATETIME NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY unique_cooldown (server_id, user_id, cooldown_name)
      )
    `);

    await connection.execute(/* sql */ `
      CREATE TABLE IF NOT EXISTS cooldown_settings (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        server_id VARCHAR(30) NOT NULL,
        cooldown_name VARCHAR(50) NOT NULL,
        duration INT UNSIGNED NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY unique_cooldown_setting (server_id, cooldown_name)
      )
    `);

    await connection.execute(/* sql */ `
      CREATE TABLE IF NOT EXISTS economy_settings (
        server_id VARCHAR(30) NOT NULL,
        crime_fine_min INT UNSIGNED DEFAULT ${config?.economySettings?.crime_fine_min?.default || 10},
        crime_fine_max INT UNSIGNED DEFAULT ${config?.economySettings?.crime_fine_max?.default || 40},
        slut_fine_min INT UNSIGNED DEFAULT ${config?.economySettings?.slut_fine_min?.default || 10},
        slut_fine_max INT UNSIGNED DEFAULT ${config?.economySettings?.slut_fine_max?.default || 20},
        rob_fine_min INT UNSIGNED DEFAULT ${config?.economySettings?.rob_fine_min?.default || 10},
        rob_fine_max INT UNSIGNED DEFAULT ${config?.economySettings?.rob_fine_max?.default || 30},
        crime_fail_rate INT UNSIGNED DEFAULT ${config?.economySettings?.crime_fail_rate?.default || 45},
        slut_fail_rate INT UNSIGNED DEFAULT ${config?.economySettings?.slut_fail_rate?.default || 35},
        start_balance_cash BIGINT UNSIGNED DEFAULT ${config?.economySettings?.start_balance_cash?.default || 0},
        start_balance_bank BIGINT UNSIGNED DEFAULT ${config?.economySettings?.start_balance_bank?.default || 0},
        work_min BIGINT UNSIGNED DEFAULT ${config?.economySettings?.work_min?.default || 20},
        work_max BIGINT UNSIGNED DEFAULT ${config?.economySettings?.work_max?.default || 250},
        slut_min BIGINT UNSIGNED DEFAULT ${config?.economySettings?.slut_min?.default || 100},
        slut_max BIGINT UNSIGNED DEFAULT ${config?.economySettings?.slut_max?.default || 400},
        crime_min BIGINT UNSIGNED DEFAULT ${config?.economySettings?.crime_min?.default || 250},
        crime_max BIGINT UNSIGNED DEFAULT ${config?.economySettings?.crime_max?.default || 700},
        chat_min BIGINT UNSIGNED DEFAULT ${config?.economySettings?.chat_min?.default || 10},
        chat_max BIGINT UNSIGNED DEFAULT ${config?.economySettings?.chat_max?.default || 100},
        symbol VARCHAR(50) DEFAULT ${config?.economySettings?.symbol?.default || '$'},
        PRIMARY KEY (server_id)
      ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    await connection.execute(/* sql */ `
      CREATE TABLE IF NOT EXISTS economy_balances (
        server_id VARCHAR(30) NOT NULL,
        user_id VARCHAR(30) NOT NULL,
        cash DECIMAL(65, 0) DEFAULT ${config?.economySettings?.start_balance_cash?.default || 0},
        bank DECIMAL(65, 0) DEFAULT ${config?.economySettings?.start_balance_bank?.default || 0},
        PRIMARY KEY (server_id, user_id)
      ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
    `);

    await connection.execute(/* sql */ `
      CREATE TABLE IF NOT EXISTS economy_store (
        server_id VARCHAR(30) NOT NULL,
        item_id CHAR(36) NOT NULL,
        item_name VARCHAR(200) NOT NULL,
        cost DECIMAL(65, 0) DEFAULT 0,
        description TEXT,
        inventory TINYINT (1) DEFAULT 1,
        time_remaining BIGINT DEFAULT NULL,
        stock INT DEFAULT -1,
        role_required VARCHAR(30) DEFAULT NULL,
        role_given VARCHAR(30) DEFAULT NULL,
        role_removed VARCHAR(30) DEFAULT NULL,
        required_balance DECIMAL(65, 0) DEFAULT 0,
        reply_message TEXT DEFAULT NULL,
        PRIMARY KEY (server_id, item_name),
        UNIQUE KEY (item_id)
      ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
    `);

    await connection.execute(/* sql */ `
      CREATE TABLE IF NOT EXISTS economy_inventory (
        server_id VARCHAR(30) NOT NULL,
        user_id VARCHAR(30) NOT NULL,
        item_id CHAR(36) NOT NULL,
        item_name VARCHAR(200) NOT NULL,
        quantity DECIMAL(65, 0) DEFAULT 0,
        cost DECIMAL(65, 0) DEFAULT 0,
        description TEXT,
        inventory TINYINT (1) DEFAULT 1,
        time_remaining BIGINT DEFAULT NULL,
        stock INT DEFAULT -1,
        role_required VARCHAR(30) DEFAULT NULL,
        role_given VARCHAR(30) DEFAULT NULL,
        role_removed VARCHAR(30) DEFAULT NULL,
        required_balance DECIMAL(65, 0) DEFAULT 0,
        reply_message TEXT DEFAULT NULL,
        PRIMARY KEY (server_id, user_id, item_id)
      ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
    `);

    await connection.execute(/* sql */ `
      CREATE TABLE IF NOT EXISTS user_playlists (
        user_id VARCHAR(30) PRIMARY KEY,
        playlists JSON NOT NULL
      ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
    `);

    // Use guild_id so reminders don't get deleted when a servers data is deleted.
    await connection.execute(/* sql */ `
      CREATE TABLE IF NOT EXISTS reminders (
        reminder_id VARCHAR(10) NOT NULL,
        color VARCHAR(6) DEFAULT NULL,
        original_message_id VARCHAR(30) DEFAULT NULL,
        user_id VARCHAR(30) DEFAULT NULL,
        channel_id VARCHAR(30) DEFAULT NULL,
        guild_id VARCHAR(30) DEFAULT NULL,
        reminder_text LONGTEXT DEFAULT NULL,
        created_at BIGINT UNSIGNED NOT NULL,
        trigger_on BIGINT UNSIGNED NOT NULL,
        direct_message BOOLEAN DEFAULT FALSE,
        PRIMARY KEY (reminder_id)
      ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
    `);

    await connection.execute(/* sql */ `
      CREATE TABLE IF NOT EXISTS auto_roles (
        server_id VARCHAR(30) NOT NULL,
        roles JSON,
        PRIMARY KEY (server_id)
      )
    `);

    await connection.execute(/* sql */ `
      CREATE TABLE IF NOT EXISTS warns (
        warn_id VARCHAR(10) NOT NULL,
        server_id VARCHAR(30) NOT NULL,
        user_id VARCHAR(30) NOT NULL,
        mod_id VARCHAR(30) NOT NULL,
        points INT NOT NULL DEFAULT 0,
        reason TEXT,
        message_url TEXT,
        timestamp BIGINT NOT NULL,
        PRIMARY KEY (warn_id),
        INDEX idx_server_user (server_id, user_id)
      );
    `);

    await connection.execute(/* sql */ `
      CREATE TABLE IF NOT EXISTS log_settings (
        server_id VARCHAR(30) NOT NULL PRIMARY KEY,
        channel_id VARCHAR(30) NULL,
        members_channel_id VARCHAR(30) NULL,
        messages_channel_id VARCHAR(30) NULL,
        channels_channel_id VARCHAR(30) NULL,
        misc_channel_id VARCHAR(30) NULL,
        all_enabled BOOLEAN DEFAULT FALSE,
        bulk_messages_deleted BOOLEAN DEFAULT FALSE,
        channel_created BOOLEAN DEFAULT FALSE,
        channel_deleted BOOLEAN DEFAULT FALSE,
        channel_updated BOOLEAN DEFAULT FALSE,
        emoji_created BOOLEAN DEFAULT FALSE,
        emoji_deleted BOOLEAN DEFAULT FALSE,
        emoji_updated BOOLEAN DEFAULT FALSE,
        member_join BOOLEAN DEFAULT FALSE,
        member_leave BOOLEAN DEFAULT FALSE,
        member_timeout BOOLEAN DEFAULT FALSE,
        member_kicked BOOLEAN DEFAULT FALSE,
        member_banned BOOLEAN DEFAULT FALSE,
        message_deleted BOOLEAN DEFAULT FALSE,
        message_updated BOOLEAN DEFAULT FALSE,
        role_created BOOLEAN DEFAULT FALSE,
        role_deleted BOOLEAN DEFAULT FALSE,
        role_updated BOOLEAN DEFAULT FALSE,
        sticker_created BOOLEAN DEFAULT FALSE,
        sticker_deleted BOOLEAN DEFAULT FALSE,
        sticker_updated BOOLEAN DEFAULT FALSE,
        thread_created BOOLEAN DEFAULT FALSE,
        thread_deleted BOOLEAN DEFAULT FALSE,
        thread_updated BOOLEAN DEFAULT FALSE,
        voice_channel_created BOOLEAN DEFAULT FALSE,
        voice_channel_deleted BOOLEAN DEFAULT FALSE,
        no_log_channels JSON
      )
    `);

    await connection.execute(/* sql */ `
      CREATE TABLE IF NOT EXISTS starboards (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        server_id VARCHAR(30) NOT NULL,
        name VARCHAR(255) NOT NULL,
        enabled BOOLEAN DEFAULT TRUE,
        channel_id VARCHAR(30) NOT NULL,
        threshold INT DEFAULT 3,
        threshold_remove VARCHAR(6) DEFAULT '0',
        color VARCHAR(10),
        emoji VARCHAR(60),
        display_emoji VARCHAR(60),
        downvote_emoji VARCHAR(60),
        allow_bots BOOLEAN DEFAULT TRUE,
        self_vote BOOLEAN DEFAULT FALSE,
        ping_author BOOLEAN DEFAULT FALSE,
        replied_to BOOLEAN DEFAULT TRUE,
        link_deletes BOOLEAN DEFAULT FALSE,
        link_edits BOOLEAN DEFAULT TRUE,
        autoreact_upvote BOOLEAN DEFAULT TRUE,
        autoreact_downvote BOOLEAN DEFAULT TRUE,
        remove_invalid_reactions BOOLEAN DEFAULT TRUE,
        require_image BOOLEAN DEFAULT FALSE,
        extra_embeds BOOLEAN DEFAULT TRUE,
        use_server_profile BOOLEAN DEFAULT TRUE,
        show_thumbnail BOOLEAN DEFAULT TRUE,
        older_than VARCHAR(20) NULL,
        newer_than VARCHAR(20) NULL,
        attachments_list BOOLEAN DEFAULT TRUE,
        UNIQUE KEY (server_id, name)
      ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
    `);

    await connection.execute(/* sql */ `
      CREATE TABLE IF NOT EXISTS starboard_overrides (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        starboard_id BIGINT NOT NULL,
        name VARCHAR(255) NOT NULL,
        channels JSON NULL,
        threshold INT NULL,
        threshold_remove VARCHAR(6) NULL,
        emoji VARCHAR(60) NULL,
        display_emoji VARCHAR(60) NULL,
        downvote_emoji VARCHAR(60) NULL,
        self_vote BOOLEAN NULL,
        allow_bots BOOLEAN NULL,
        require_image BOOLEAN NULL,
        older_than VARCHAR(20) NULL,
        newer_than VARCHAR(20) NULL,
        enabled BOOLEAN NULL,
        autoreact_upvote BOOLEAN NULL,
        autoreact_downvote BOOLEAN NULL,
        link_deletes BOOLEAN NULL,
        link_edits BOOLEAN NULL,
        remove_invalid_reactions BOOLEAN NULL,
        ping_author BOOLEAN NULL,
        extra_embeds BOOLEAN NULL,
        use_server_profile BOOLEAN NULL,
        color VARCHAR(10) NULL,
        replied_to BOOLEAN NULL,
        attachments_list BOOLEAN NULL,
        show_thumbnail BOOLEAN NULL,
        FOREIGN KEY (starboard_id) REFERENCES starboards (id) ON DELETE CASCADE,
        UNIQUE KEY (starboard_id, name)
      ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
    `);

    await connection.execute(/* sql */ `
      CREATE TABLE IF NOT EXISTS starboard_messages (
        starboard_id BIGINT NOT NULL,
        original_msg_id VARCHAR(30) NOT NULL,
        starboard_msg_id VARCHAR(30) NOT NULL,
        stars INT DEFAULT 0,
        author_id VARCHAR(30) NOT NULL,
        channel_id VARCHAR(30) NOT NULL,
        PRIMARY KEY (starboard_id, original_msg_id),
        FOREIGN KEY (starboard_id) REFERENCES starboards (id) ON DELETE CASCADE
      ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
    `);

    await connection.execute(/* sql */ `
      CREATE TABLE IF NOT EXISTS giveaways (
        message_id VARCHAR(30) PRIMARY KEY,
        channel_id VARCHAR(30) NOT NULL,
        server_id VARCHAR(30) NOT NULL,
        required_role VARCHAR(30),
        prize VARCHAR(255) NOT NULL,
        winner_count INT DEFAULT 1,
        started_at BIGINT NOT NULL,
        end_at BIGINT NOT NULL,
        host_id VARCHAR(30) NOT NULL,
        winners JSON,
        winner_history JSON,
        status ENUM('active', 'ended') DEFAULT 'active'
      );
    `);

    await connection.execute(/* sql */ `
      CREATE TABLE IF NOT EXISTS giveaway_entries (
        server_id VARCHAR(30),
        message_id VARCHAR(30),
        user_id VARCHAR(30),
        PRIMARY KEY (message_id, user_id)
      );
    `);

    await connection.execute(/* sql */ `
      CREATE TABLE IF NOT EXISTS honeypots (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        server_id VARCHAR(30) NOT NULL,
        channel_id VARCHAR(30) NOT NULL,
        warning_message_id VARCHAR(30) DEFAULT NULL,
        log_channel_id VARCHAR(30) DEFAULT NULL,
        action ENUM('disabled', 'softban', 'ban') NOT NULL DEFAULT 'softban',
        reinvite VARCHAR(255) DEFAULT NULL,
        options JSON NOT NULL,
        trigger_count INT UNSIGNED NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_guild (server_id),
        INDEX idx_channel (channel_id),
        INDEX idx_log_channel (log_channel_id)
      ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
    `);

    await connection.execute(/* sql */ `
      CREATE TABLE IF NOT EXISTS honeypot_triggers (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        server_id VARCHAR(30) NOT NULL,
        user_id VARCHAR(30) NOT NULL,
        channel_id VARCHAR(30) NOT NULL,
        message_id VARCHAR(30) DEFAULT NULL,
        action_taken ENUM('softban', 'ban', 'none') NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_guild_user (server_id, user_id),
        INDEX idx_created (created_at)
      ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
    `);

    // Use guild_id so scores don't get deleted when a servers data is deleted.
    await connection.execute(/* sql */ `
      CREATE TABLE IF NOT EXISTS game_scores (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        game_type VARCHAR(32) NOT NULL,
        user_id VARCHAR(30) NOT NULL,
        score BIGINT NULL,
        time_ms INT UNSIGNED NULL,
        guild_id VARCHAR(30) NULL,
        played_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_game_score (game_type, score DESC, time_ms ASC),
        INDEX idx_game_time (game_type, time_ms ASC, score DESC),
        INDEX idx_user_game (user_id, game_type, played_at),
        INDEX idx_guild_game (guild_id, game_type, score DESC)
      ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
    `);

    const [views] = await connection.query(/* sql */ `
      SHOW FULL TABLES IN ${config.mysql.database}
      WHERE
        TABLE_TYPE LIKE 'VIEW'
    `);
    const viewExists = views.some((row) => Object.values(row).includes('globalruns'));

    if (!viewExists) {
      await connection.execute(/* sql */ `
        CREATE ALGORITHM = UNDEFINED SQL SECURITY DEFINER VIEW globalruns AS
        SELECT
          (
            SUM(command_stats.text_runs) + SUM(command_stats.slash_runs)
          ) AS TOTAL_COMMANDS,
          SUM(command_stats.text_runs) AS TEXT_RUNS,
          SUM(command_stats.slash_runs) AS SLASH_RUNS
        FROM
          command_stats;
      `);
    }

    const [procedures] = await connection.query(
      /* sql */
      `
        SELECT
          ROUTINE_NAME
        FROM
          information_schema.ROUTINES
        WHERE
          ROUTINE_TYPE = 'PROCEDURE'
          AND ROUTINE_SCHEMA = ?
          AND ROUTINE_NAME = 'updateCommandStats'
      `,
      [config.mysql.database],
    );

    if (procedures.length === 0) {
      await connection.query(/* sql */ `
        CREATE PROCEDURE updateCommandStats (
          p_command_name LONGTEXT,
          p_text_runs INT,
          p_slash_runs INT,
          p_isAlias BOOLEAN,
          p_aliasName LONGTEXT
        )
        BEGIN
        INSERT INTO
          command_stats (
            command_name,
            total_runs,
            text_runs,
            slash_runs,
            last_run
          )
        VALUES
          (
            p_command_name,
            1,
            p_text_runs,
            p_slash_runs,
            now()
          ) ON DUPLICATE KEY
        UPDATE total_runs = total_runs + 1,
        last_run = now(),
        text_runs = text_runs +
        VALUES
          (text_runs),
          slash_runs = slash_runs +
        VALUES
          (slash_runs);

        IF (p_isAlias = 1) THEN
        INSERT INTO
          command_aliases (alias_name, base_command, uses, last_run)
        VALUES
          (p_aliasName, p_command_name, 1, now()) ON DUPLICATE KEY
        UPDATE uses = uses + 1,
        last_run = now();

        END IF;

        END
      `);
    }

    console.log('MySQL connection established.');
  } catch (error) {
    console.error('Error setting up MySQL tables and procedures:', error);
  } finally {
    connection.release();
  }
};

const init = async function init() {
  function getSlashCommands(dir) {
    const slashFiles = readdirSync(dir);

    for (const file of slashFiles) {
      const loc = path.resolve(dir, file);
      const stats = statSync(loc);

      if (stats.isDirectory()) {
        getSlashCommands(path.resolve(dir, file));
      } else {
        const commandName = file.split('.')[0];
        client.loadInteraction(loc, commandName);
      }
    }
  }

  function getCommands(dir) {
    const cmdFiles = readdirSync(dir);

    for (const file of cmdFiles) {
      const loc = path.resolve(dir, file);
      const stats = statSync(loc);

      if (stats.isDirectory()) {
        getCommands(path.resolve(dir, file));
      } else {
        const commandName = file.split('.')[0];
        client.loadCommand(loc, commandName);
      }
    }
  }

  async function getEvents(dir) {
    const eventFiles = readdirSync(dir);

    for (const file of eventFiles) {
      const loc = path.resolve(dir, file);
      const stats = statSync(loc);

      if (stats.isDirectory()) {
        await getEvents(path.resolve(dir, file));
      } else {
        const eventName = file.split('.')[0];
        const eventModule = await import(new URL(`file://${loc}`).href); // Use ESM import
        client.loadEvent(eventModule, eventName); // Access the default export
      }
    }
  }

  getCommands('./commands');
  getSlashCommands('./slash_commands');
  await getEvents('./events');

  client.levelCache = {};
  for (let i = 0; i < client.permLevels.length; i++) {
    const thisLevel = client.permLevels[i];
    client.levelCache[thisLevel.name] = thisLevel.level;
  }

  client.login(config.token);
};

const start = async () => {
  await loadMysql();
  await client.loadSettings();
  await loadLavalink();
  client.reloadLavalinkNodes = reloadLavalinkNodes; // Callable from owner commands: await client.reloadLavalinkNodes();
  await init();
};

start().catch((error) => {
  console.error('Failed to start bot:', error);
});

client.on('error', (e) => {
  console.error(e);
  client.logger.error(e);
});
client.on('warn', (info) => {
  console.log(info);
  client.logger.warn(info);
});

process.on('uncaughtException', (err) => {
  console.error(err);
  client.logger.error(`Uncaught Exception: ${err}`);
});

process.on('unhandledRejection', (err) => {
  console.log(err);
  return client.logger.error(`Unhandled Rejection: ${err}`);
});
