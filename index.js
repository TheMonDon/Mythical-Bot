if (Number(process.version.slice(1).split('.')[0]) < 16) throw new Error('Node 16.x or higher is required. Update Node on your system.');

const { Intents, Collection, Client } = require('discord.js');
const DiscordJS = require('discord.js');
const { readdirSync, statSync } = require('fs');
const Enmap = require('enmap');
const db = require('quick.db');
const path = require('path');
const { Player } = require('discord-player');
const mysql = require('mysql2');
const config = require('./config.js');

class Bot extends Client {
  constructor (options) {
    super(options);

    this.config = config;
    this.commands = new Collection();
    this.aliases = new Collection();
    this.slashcmds = new Collection();

    this.settings = new Enmap({ name: 'settings', cloneLevel: 'deep', fetchAll: false, autoFetch: true });
    this.games = new Enmap({ name: 'games', cloneLevel: 'deep', fetchAll: false, autoFetch: true });

    this.logger = require('./util/Logger');

    // Basically just an async shortcut to using a setTimeout. Nothing fancy!
    this.wait = require('util').promisify(setTimeout);
  }

  // PERMISSION LEVEL FUNCTION
  permlevel (message) {
    let permlvl = 0;

    const permOrder = this.config.permLevels.slice(0).sort((p, c) => p.level < c.level ? 1 : -1);

    while (permOrder.length) {
      const currentLevel = permOrder.shift();
      if (message.guild && currentLevel.guildOnly) continue;
      if (currentLevel.check(message)) {
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

  loadCommand (commandPath, commandName) {
    try {
      const props = new (require(commandPath))(this);
      props.conf.location = commandPath;
      if (props.init) {
        props.init(this);
      }

      this.commands.set(props.help.name, props);
      props.conf.aliases.forEach(alias => {
        this.aliases.set(alias, props.help.name);
      });
      return false;
    } catch (e) {
      return console.log(`Unable to load command ${commandName}: ${e}`);
    }
  }

  async unloadCommand (commandPath, commandName) {
    let command;
    if (this.commands.has(commandName)) {
      command = this.commands.get(commandName);
    } else if (this.aliases.has(commandName)) {
      command = this.commands.get(this.aliases.get(commandName));
    }
    if (!command) return console.log(`The command \`${commandName}\` doesn't seem to exist, nor is it an alias. Try again!`);

    if (command.shutdown) {
      await command.shutdown(this);
    }
    delete require.cache[require.resolve(commandPath)];
    return false;
  }

  /*
  MESSAGE CLEAN FUNCTION
  "Clean" removes @everyone pings, as well as tokens, and makes code blocks
  escaped so they're shown more easily. As a bonus it resolves promises
  and stringifies objects!
  This is mostly only used by the Eval and Exec commands.
  */
  async clean (text) {
    if (text?.constructor.name === 'Promise') { text = await text; }
    if (typeof text !== 'string') { text = require('util').inspect(text, { depth: 1 }); }

    text = text
      .replace(/`/g, '`' + String.fromCharCode(8203))
      .replace(/@/g, '@' + String.fromCharCode(8203))
      .replace(this.token, 'mfa.VkO_2G4Qv3T--NO--lWetW_tjND--TOKEN--QFTm6YGtzq9PH--4U--tG0');

    return text;
  }

  /* SETTINGS FUNCTIONS
  These functions are used by any and all location in the bot that wants to either
  read the current *complete* guild settings (default + overrides, merged) or that
  wants to change settings for a specific guild.
  */

  // getSettings merges the client defaults with the guild settings. guild settings in
  // enmap should only have *unique* overrides that are different from defaults.
  getSettings (guild) {
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
  writeSettings (id, newSettings) {
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
const myIntents = new Intents();
myIntents.add(Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_BANS, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS, Intents.FLAGS.GUILD_INTEGRATIONS, Intents.FLAGS.GUILD_WEBHOOKS, Intents.FLAGS.GUILD_INVITES, Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Intents.FLAGS.DIRECT_MESSAGES, Intents.FLAGS.DIRECT_MESSAGE_REACTIONS);
const client = new Bot({ intents: myIntents });

// Create MySQL Pool globally
global.pool = mysql.createPool({
  host: config.mysqlHost,
  user: config.mysqlUsername,
  password: config.mysqlPassword
});

// Load the music player stuff
client.player = new Player(client, {
  autoSelfDeaf: true,
  enableLive: true
});

client.player
  .on('trackStart', async (queue, track) => {
    const em = new DiscordJS.MessageEmbed()
      .setTitle('Now Playing')
      .setDescription(`[${track.title}](${track.url}) \n\nRequested By: ${track.requestedBy}`)
      .setThumbnail(track.thumbnail)
      .setColor('0099CC');
    const msg = await queue.metadata.channel.send({ embeds: [em] });

    const oldmsg = db.get(`servers.${queue.metadata.guild.id}.music.lastTrack`) || null;
    if (oldmsg !== null) {
      try {
        await queue.metadata.guild.channels.cache.get(oldmsg.channelId).messages.cache.get(oldmsg.id).delete();
      } catch {
        db.delete(`servers.${queue.metadata.guild.id}.music.lastTrack`);
      }
    }

    db.set(`servers.${queue.metadata.guild.id}.music.lastTrack`, msg);
  })
  .on('trackAdd', (queue, track) => {
    const title = track.title || track.tracks[track.tracks.length - 1].title;
    const url = track.url || track.tracks[track.tracks.length - 1].url;
    const requestedBy = track.requestedBy || track.tracks[track.tracks.length - 1].requestedBy;

    const em = new DiscordJS.MessageEmbed()
      .setTitle('Track Added to Queue')
      .setThumbnail(track.thumbnail)
      .setColor('0099CC')
      .setDescription(`[${title}](${url}) \n\nRequested By: ${requestedBy}`);
    queue.metadata.channel.send({ embeds: [em] });
  })
  .on('tracksAdd', (queue, tracks) => {
    const playlist = tracks[0].playlist;
    const length = playlist.videos?.length || playlist.tracks?.length || 'N/A';

    const em = new DiscordJS.MessageEmbed()
      .setTitle('Playlist Added to Queue')
      .setThumbnail(playlist.thumbnail)
      .setColor('0099CC')
      .setDescription(`[${playlist.title}](${playlist.url}) \n\nRequested By: ${tracks[0].requestedBy}`)
      .addField('Playlist Length', length.toString(), true);
    queue.metadata.channel.send({ embeds: [em] });
  })
  .on('noResults', (queue, query) => queue.metadata.channel.send(`No results were found for ${query}.`))
  .on('queueEnd', (queue) => queue.metadata.channel.send('Music stopped as there is no more music in the queue.'))
  .on('error', (queue, error) => {
    switch (error) {
      case 'NotPlaying':
        queue.metadata.channel.send('There is no music being played on this server!');
        break;
      case 'NotConnected':
        queue.metadata.channel.send('You are not connected in any voice channel!');
        break;
      case 'UnableToJoin':
        queue.metadata.channel.send('I am not able to join your voice channel, please check my permissions!');
        break;
      case 'DestroyedQueue':
        break;
      default:
        queue.metadata.channel.send(`Something went wrong... ${error}`);
        break;
    }
  });

const init = async () => {
  // Let's load the slash commands, we're using a recursive method so you can have
  // folders within folders, within folders, within folders, etc and so on.
  function getSlashCommands (dir) {
    const slashFiles = readdirSync(dir);
    for (const file of slashFiles) {
      const loc = path.resolve(dir, file);
      const stats = statSync(loc);
      if (stats.isDirectory()) {
        getSlashCommands(path.resolve(dir, file));
      } else {
        const command = new (require(loc))(client);
        client.slashcmds.set(command.commandData.name, command);
      }
    }
  }

  // Here we load **commands** into memory, as a collection, so they're accessible
  // here and everywhere else, and like the slash commands, sub-folders for days!
  function getCommands (dir) {
    const cmdFile = readdirSync(dir);
    for (const file of cmdFile) {
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

  // Now let's call the functions to actually load up the commands!
  getCommands('./commands');
  getSlashCommands('./slash');

  // Then we load events, which will include our message and ready event.
  const eventFiles = readdirSync('./events/').filter(file => file.endsWith('.js'));
  for (const file of eventFiles) {
    const eventName = file.split('.')[0];
    const event = new (require(`./events/${file}`))(client);

    // This line is awesome by the way. Just sayin'.
    client.on(eventName, (...args) => event.run(...args));
    delete require.cache[require.resolve(`./events/${file}`)];
  }

  client.levelCache = {};
  for (let i = 0; i < client.config.permLevels.length; i++) {
    const thisLevel = client.config.permLevels[i];
    client.levelCache[thisLevel.name] = thisLevel.level;
  }

  // Here we login the client.
  client.login(client.config.token);

  // End top-level async/await function.
};

init();

client.on('disconnect', () => client.logger.warn('Bot is disconnecting...'))
  .on('reconnecting', () => client.logger.log('Bot reconnecting...', 'log'))
  .on('error', e => client.logger.error(e))
  .on('warn', info => client.logger.warn(info));

client.on('raw', packet => {
  // We don't want this to run on unrelated packets
  if (!['MESSAGE_REACTION_ADD', 'MESSAGE_REACTION_REMOVE'].includes(packet.t)) return;
  // Grab the channel to check the message from
  const channel = client.channels.cache.get(packet.d.channel_id);
  // There's no need to emit if the message is cached, because the event will fire anyway for that
  if (channel.messages.cache.has(packet.d.message_id)) return;
  // Since we have confirmed the message is not cached, let's fetch it
  channel.messages.fetch(packet.d.message_id).then(message => {
    // Emojis can have identifiers of name:id format, so we have to account for that case as well
    const emoji = packet.d.emoji.id ? `${packet.d.emoji.name}:${packet.d.emoji.id}` : packet.d.emoji.name;
    // This gives us the reaction we need to emit the event properly, in top of the message object
    const reaction = message.reactions.cache.get(emoji);
    // Adds the currently reacting user to the reaction's users collection.
    if (reaction) reaction.users.cache.set(packet.d.user_id, client.users.cache.get(packet.d.user_id));
    // Check which type of event it is before emitting
    if (packet.t === 'MESSAGE_REACTION_ADD') {
      client.emit('messageReactionAdd', reaction, client.users.cache.get(packet.d.user_id));
    }
    if (packet.t === 'MESSAGE_REACTION_REMOVE') {
      client.emit('messageReactionRemove', reaction, client.users.cache.get(packet.d.user_id));
    }
  });
});

process.on('uncaughtException', (err) => {
  // eslint-disable-next-line node/no-path-concat
  const errorMsg = err.stack.replace(new RegExp(`${__dirname}/`, 'g'), './');
  console.error('Uncaught Exception: ', errorMsg);
  // Always best practice to let the code crash on uncaught exceptions.
  // Because you should be catching them anyway.
  process.exit(1);
});

process.on('unhandledRejection', err => {
  console.error('Uncaught Promise Error: ', err);
});
