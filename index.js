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
const { GiveawaysManager } = require('discord-giveaways');
const { LavalinkManager } = require('lavalink-client');
const { readdirSync, statSync } = require('fs');
const { QuickDB } = require('quick.db');
const config = require('./config.js');
require('moment-duration-format');
const moment = require('moment');
const Enmap = require('enmap');
const path = require('path');

const db = new QuickDB();

class Bot extends Client {
  constructor(options) {
    super(options);

    this.config = config;
    this.commands = new Collection();
    this.aliases = new Collection();
    this.slashCommands = new Collection();
    this.util = require('./util/Util.js');

    this.settings = new Enmap({ name: 'settings', cloneLevel: 'deep', fetchAll: false, autoFetch: true });
    this.games = new Enmap({ name: 'games', cloneLevel: 'deep', fetchAll: false, autoFetch: true });
    this.pauseTimeouts = new Map();

    this.logger = require('./util/Logger.js');

    // PERMISSION LEVEL DEFINITIONS.
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
          const premium = await db.get(`users.${context.user ? context.user.id : context.author.id}.premium`);
          return premium === true;
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

    const permOrder = client.permLevels.slice(0).sort((p, c) => (p.level < c.level ? 1 : -1));

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
    client.on(eventName, (...args) => eventModule.run(client, ...args));
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
    const guildData = guild ? this.settings.get(guild.id) || {} : {};
    const returnObject = {};
    Object.keys(defaults).forEach((key) => {
      returnObject[key] = guildData[key] ? guildData[key] : defaults[key];
    });
    return returnObject;
  }

  // writeSettings overrides, or adds, any configuration item that is different
  // than the defaults. This ensures less storage wasted and to detect overrides.
  writeSettings(id, newSettings) {
    const defaults = this.settings.get('default');
    let settings = this.settings.get(id);
    if (typeof settings !== 'object') settings = {};
    for (const key in newSettings) {
      if (defaults[key] !== newSettings[key]) {
        settings[key] = newSettings[key];
      } else {
        delete settings[key];
      }
    }
    this.settings.set(id, settings);
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

const loadGiveaways = async () => {
  if (!Array.isArray(await db.get('giveaways'))) await db.set('giveaways', []);

  const GiveawayManagerWithOwnDatabase = class extends GiveawaysManager {
    // This function is called when the manager needs to get all giveaways which are stored in the database.
    async getAllGiveaways() {
      // Get all giveaways from the database
      return await db.get('giveaways');
    }

    // This function is called when a giveaway needs to be saved in the database.
    async saveGiveaway(_messageId, giveawayData) {
      // Add the new giveaway to the database
      await db.push('giveaways', giveawayData);
      // Don't forget to return something!
      return true;
    }

    // This function is called when a giveaway needs to be edited in the database.
    async editGiveaway(messageId, giveawayData) {
      // Get all giveaways from the database
      const giveaways = await db.get('giveaways');
      // Remove the unedited giveaway from the array
      const newGiveawaysArray = giveaways.filter((giveaway) => giveaway.messageId !== messageId);
      // Push the edited giveaway into the array
      newGiveawaysArray.push(giveawayData);
      // Save the updated array
      await db.set('giveaways', newGiveawaysArray);
      // Don't forget to return something!
      return true;
    }

    // This function is called when a giveaway needs to be deleted from the database.
    async deleteGiveaway(messageId) {
      // Get all giveaways from the database
      const giveaways = await db.get('giveaways');
      // Remove the giveaway from the array
      const newGiveawaysArray = giveaways.filter((giveaway) => giveaway.messageId !== messageId);
      // Save the updated array
      await db.set('giveaways', newGiveawaysArray);
      // Don't forget to return something!
      return true;
    }
  };

  // Create a new instance of your new class
  const manager = new GiveawayManagerWithOwnDatabase(client, {
    default: {
      botsCanWin: false,
      embedColor: '#0099CC',
      embedColorEnd: '#000000',
      reaction: '🎉',
    },
  });

  // We now have a giveawaysManager property to access the manager everywhere!
  client.giveawaysManager = manager;
};

const loadLavalink = async () => {
  if (!Array.isArray(config.nodes) || config.nodes.length === 0) return;

  client.lavalink = new LavalinkManager({
    nodes: config.nodes,
    sendToShard: (guildId, payload) => client.guilds.cache.get(guildId)?.shard?.send(payload),
    autoSkip: true,
    client: {
      id: 'PLACEHOLDER', // Will be updated when ready
      username: 'Mythical Bot',
    },
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
      console.warn(`Disconnected from Lavalink node: ${node.id}, Reason: ${reason}`);
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

        const durationString = moment
          .duration(track.info.duration || 0)
          .format('y[ years][,] M[ Months][,] d[ days][,] h[ hours][,] m[ minutes][ and] s[ seconds]');

        let title = track.info.title;
        if (track.info.sourceName === 'youtube') {
          title = title.replace(/^.*?- */, '');
        }

        const guild = client.guilds.cache.get(player.guildId);
        const requester = guild.members.cache.get(track.requester.id);
        const buffer = await client.util.generateTrackStartCard({
          title,
          artist: track.info.author,
          thumbnailUrl: track.info.artworkUrl,
          duration: durationString,
          requestedBy: requester.displayName,
          queueLength: player.queue.tracks.length,
          requesterAvatarUrl: requester.displayAvatarURL({ extension: 'png', size: 128 }),
        });

        const oldmsg = (await db.get(`servers.${player.guildId}.music.lastTrack`)) || null;
        if (oldmsg !== null) {
          try {
            const channel = client.channels.cache.get(oldmsg.channelId);
            if (channel) {
              const message = await channel.messages.fetch(oldmsg.id).catch(() => null);
              if (message) {
                await message.delete().catch(() => {});
              }
            }
          } catch {
            await db.delete(`servers.${player.guildId}.music.lastTrack`);
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

        if (msg) {
          await db.set(`servers.${player.guildId}.music.lastTrack`, {
            id: msg.id,
            channelId: msg.channel.id,
          });

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
        }
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
    .on('playerError', (player, error) => {
      console.log(`Something went wrong: ${error}`);
      player.textChannelId && client.channels.cache.get(player.textChannelId)?.send(`Something went wrong: ${error}`);
    })
    .on('trackError', async (player, track, error) => {
      console.log(`Track failed: ${error.exception?.message || error.message}`);
      (await player.textChannelId) &&
        client.channels.cache
          .get(player.textChannelId)
          ?.send(`Track failed: ${error.exception?.message || error.message}`);
    });

  // Handle raw Discord events for voice state updates
  client.on('raw', (d) => client.lavalink.sendRawData(d));

  // Initialize lavalink when the bot is ready
  client.once('ready', () => {
    // Update client ID now that the bot is ready
    client.lavalink.options.client.id = client.user.id;
    console.log('Initializing Lavalink...');
    client.lavalink.init(client.user);
  });
};

const loadMysql = async () => {
  if (!config.mysql?.host && !config.mysql?.database) {
    console.error('MySQL configuration not found, skipping MySQL setup.');
    console.error('Some features may not work as intended.');
    return;
  }

  const mysql = require('mysql2/promise');

  const tempConn = await mysql.createConnection({
    host: config.mysql.host,
    user: config.mysql.user,
    password: config.mysql.password,
  });

  await tempConn.query(`CREATE DATABASE IF NOT EXISTS ${config.mysql.database}`);
  await tempConn.end();

  const pool = mysql.createPool({
    host: config.mysql.host,
    user: config.mysql.user,
    password: config.mysql.password,
    multipleStatements: true,
    database: config.mysql.database,
  });

  client.db = pool;

  const connection = await pool.getConnection();

  // Create tables if they do not exist
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS command_aliases (
      alias_name VARCHAR(100) NOT NULL,
      base_command VARCHAR(100) DEFAULT NULL,
      uses INT DEFAULT 0,
      PRIMARY KEY (alias_name)
    );
  `);

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS command_stats (
      command_name VARCHAR(100) NOT NULL,
      total_runs INT DEFAULT 0,
      text_runs INT DEFAULT 0,
      slash_runs INT DEFAULT 0,
      PRIMARY KEY (command_name)
    );
  `);

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS chatbot_stats (
      id int NOT NULL,
      total_runs int DEFAULT 0,
      PRIMARY KEY (id)
    );
  `);

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS chatbot_daily_stats (
      date date NOT NULL,
      total_runs int DEFAULT 0,
      PRIMARY KEY (date),
      UNIQUE KEY date_UNIQUE (date)
    );
  `);

  const [triggers] = await connection.query(
    `
    SELECT TRIGGER_NAME FROM information_schema.TRIGGERS
    WHERE TRIGGER_SCHEMA = ? AND TRIGGER_NAME = ?`,
    [config.mysql.database, 'chatbot_stats_AFTER_INSERT'],
  );

  if (triggers.length === 0) {
    await connection.query(`
      CREATE TRIGGER chatbot_stats_AFTER_INSERT
      AFTER UPDATE ON chatbot_stats
      FOR EACH ROW
      BEGIN
        INSERT IGNORE INTO chatbot_daily_stats (date, total_runs)
        VALUES (CURDATE(), 0);
      
        UPDATE chatbot_daily_stats
        SET total_runs = total_runs + 1
        WHERE date = CURDATE();
      END
    `);
  }

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS ticket_settings (
      server_id VARCHAR(100) PRIMARY KEY,
      ticket_limit INT DEFAULT 3,
      role_id VARCHAR(100) DEFAULT NULL,
      category_id VARCHAR(100) DEFAULT NULL,
      logging_id VARCHAR(100) DEFAULT NULL
    );
  `);

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS user_tickets (
      server_id VARCHAR(100) NOT NULL,
      channel_id VARCHAR(100) NOT NULL,
      user_id VARCHAR(100) NOT NULL,
      topic_cooldown BOOLEAN DEFAULT FALSE,
      cooldown_until BIGINT DEFAULT NULL,
      PRIMARY KEY (server_id, channel_id)
    );
  `);

  const [views] = await connection.query(`SHOW FULL TABLES IN ${config.mysql.database} WHERE TABLE_TYPE LIKE 'VIEW'`);
  const viewExists = views.some((row) => Object.values(row).includes('globalruns'));

  if (!viewExists) {
    await connection.execute(`
      CREATE 
          ALGORITHM = UNDEFINED 
          SQL SECURITY DEFINER
      VIEW globalruns AS
          SELECT 
              (SUM(command_stats.text_runs) + SUM(command_stats.slash_runs)) AS TOTAL_COMMANDS,
              SUM(command_stats.text_runs) AS TEXT_RUNS,
              SUM(command_stats.slash_runs) AS SLASH_RUNS
          FROM command_stats;
    `);
  }

  const [procedures] = await connection.query(
    `
      SELECT ROUTINE_NAME
      FROM information_schema.ROUTINES
      WHERE ROUTINE_TYPE = 'PROCEDURE'
        AND ROUTINE_SCHEMA = ?
        AND ROUTINE_NAME = 'updateCommandStats'
    `,
    [config.mysql.database],
  );

  if (procedures.length === 0) {
    await connection.query(`
      CREATE PROCEDURE updateCommandStats(
        p_command_name LONGTEXT,
        p_text_runs INT,
        p_slash_runs INT,
        p_isAlias BOOLEAN,
        p_aliasName LONGTEXT
      )
      BEGIN
        INSERT INTO command_stats (command_name, total_runs, text_runs, slash_runs)
          VALUES (p_command_name, 1, p_text_runs, p_slash_runs)
          ON DUPLICATE KEY UPDATE
            total_runs = total_runs + 1,
            text_runs = text_runs + VALUES(text_runs),
            slash_runs = slash_runs + VALUES(slash_runs);
  
        IF (p_isAlias = 1) THEN
          INSERT INTO command_aliases (alias_name, base_command, uses)
            VALUES (p_aliasName, p_command_name, 1)
            ON DUPLICATE KEY UPDATE uses = uses + 1;
        END IF;
      END
    `);
  }

  connection.release();

  console.log('MySQL connection established.');
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

loadGiveaways();
loadLavalink();
loadMysql();
init();

client.on('error', (e) => client.logger.error(e));
client.on('warn', (info) => client.logger.warn(info));

process.on('uncaughtException', (err) => {
  console.error(err);
  client.logger.error(`Uncaught Exception: ${err}`);
});

process.on('unhandledRejection', (err) => {
  console.log(err);
  return client.logger.error(`Unhandled Rejection: ${err}`);
});
