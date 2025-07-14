const { GatewayIntentBits, Collection, Client, EmbedBuilder, Partials } = require('discord.js');
const { DefaultExtractors } = require('@discord-player/extractor');
const { YoutubeiExtractor } = require('discord-player-youtubei');
const { GiveawaysManager } = require('discord-giveaways');
const { readdirSync, statSync } = require('fs');
const { Player } = require('discord-player');
const { QuickDB } = require('quick.db');
const config = require('./config.js');
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
    if (!command)
      return client.logger.error(`The slash command \`${interactionName}\` doesn't seem to exist. Try again!`);

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
      return client.logger.error(
        `The command \`${commandName}\` doesn't seem to exist, nor is it an alias. Try again!`,
      );

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

const loadMusic = async () => {
  const player = new Player(client, {
    autoSelfDeaf: true,
    enableLive: true,
  });

  await player.extractors.loadMulti(DefaultExtractors);

  await player.extractors.register(YoutubeiExtractor, {});

  let consecutiveFails = 0;

  player.events
    .on('playerStart', async (queue, track) => {
      try {
        consecutiveFails = 0;
        if (queue.repeatMode === 1) return;

        const em = new EmbedBuilder()
          .setTitle('Now Playing')
          .setDescription(`[${track.title}](${track.url}) \n\nRequested By: ${track.requestedBy}`)
          .setColor(queue.metadata.settings.embedColor);

        if (track.thumbnail) {
          em.setThumbnail(track.thumbnail);
        }

        const msg = await queue.metadata.channel.send({ embeds: [em] }).catch(() => {});

        const oldmsg = (await db.get(`servers.${queue.metadata.guild.id}.music.lastTrack`)) || null;
        if (oldmsg !== null) {
          try {
            await queue.metadata.guild.channels.cache
              .get(oldmsg.channelId)
              .messages.cache.get(oldmsg.id)
              .delete()
              .catch(() => {});
          } catch {
            await db.delete(`servers.${queue.metadata.guild.id}.music.lastTrack`);
          }
        }

        await db.set(`servers.${queue.metadata.guild.id}.music.lastTrack`, msg);
      } catch (error) {
        client.logger.error(error);
      }
    })
    .on('audioTrackAdd', (queue, track) => {
      const em = new EmbedBuilder()
        .setTitle('Track Added to Queue')
        .setThumbnail(track.thumbnail)
        .setColor(queue.metadata.settings.embedColor)
        .setDescription(`[${track.title}](${track.url}) \n\nRequested By: ${track.requestedBy}`);

      queue.metadata.channel.send({ embeds: [em] }).catch(() => {});
    })
    .on('audioTracksAdd', (queue, tracks) => {
      const playlist = tracks[0].playlist;
      const length = playlist.videos?.length || playlist.tracks?.length || 0;

      const em = new EmbedBuilder()
        .setTitle('Playlist Added to Queue')
        .setColor(queue.metadata.settings.embedColor)
        .addFields([{ name: 'Playlist Length', value: length.toString(), inline: true }]);

      if (playlist.url) {
        em.setDescription(`[${playlist.title}](${playlist.url}) \n\nRequested By: ${tracks[0].requestedBy}`);
      } else {
        em.setDescription(`${playlist.title} \n\nRequested By: ${tracks[0].requestedBy}`);
      }

      if (playlist.thumbnail) {
        em.setThumbnail(playlist.thumbnail);
      }

      queue.metadata.channel.send({ embeds: [em] }).catch(() => {});
    })
    .on('noResults', (queue, query) => queue.metadata.channel.send(`No results were found for ${query}.`))
    .on('emptyQueue', (queue) => {
      const em = new EmbedBuilder()
        .setTitle('Queue Ended')
        .setColor(queue.metadata.settings.embedColor)
        .setDescription('Music has been stopped since the queue has no more tracks.');

      queue.metadata.channel.send({ embeds: [em] }).catch(() => {});
    })
    .on('playerError', (queue, error) => {
      console.log(`Something went wrong: ${error}`);
      queue.metadata.channel.send(`Something went wrong: ${error}`);
    })
    .on('error', async (queue, error) => {
      console.log(`Track failed: ${error.message}`);
      await queue.metadata.channel.send(`Track failed: ${error.message}`);

      consecutiveFails++;

      if (consecutiveFails > 5) {
        console.log('Too many failures in a row — clearing queue.');
        await queue.metadata.channel.send('Too many failures in a row — clearing queue.');
        queue.delete();
        consecutiveFails = 0;
        return;
      }

      if (queue.size > 0) {
        console.log('Waiting 5 seconds before skip...');
        await queue.metadata.channel.send('Waiting 5 seconds before skipping the broken song.');
        // eslint-disable-next-line promise/param-names
        await new Promise((r) => setTimeout(r, 5000));
        queue.node.skip();
        queue.node.play();
      } else {
        queue.delete();
        consecutiveFails = 0;
      }
    });

  // Enable when you need to debug discord-player
  // player.on('debug', console.log).events.on('debug', (queue, msg) => console.log(`[${queue.guild.name}] ${msg}`));
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
loadMusic();
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
