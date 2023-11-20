const yes = ['yes', 'y', 'ye', 'yeah', 'yup', 'yea', 'ya', 'correct', 'sure', 'hell yeah', 'ok', 'okay'];
const no = ['no', 'n', 'nah', 'nope', 'fuck off', 'nada', 'cancel', 'stop'];
const inviteRegex = /(https?:\/\/)?(www\.|canary\.|ptb\.)?discord(\.gg|(app)?\.com\/invite|\.me)\/([^ ]+)\/?/gi;
const botInvRegex = /(https?:\/\/)?(www\.|canary\.|ptb\.)?discord(app)?\.com\/(api\/)?oauth2\/authorize\?([^ ]+)\/?/gi;
const { Message, EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

/**
 * Turns an array into a list with definable ending conjunction
 * @param {Array} array - The array to turn to a list
 * @param {String} conj - Conjunction to end with, default 'and'
 */
function list(array, conj = 'and') {
  const len = array.length;
  if (len === 0) return '';
  if (len === 1) return array[0];
  return `${array.slice(0, -1).join(', ')}${len > 1 ? `${len > 2 ? ',' : ''} ${conj} ` : ''}${array.slice(-1)}`;
}

/**
 * Verify yes/no answer in channel
 * @param {GuildChannel} channel - The channel to detect reply
 * @param {GuildMember} user - The user to detect reply
 * @param {Number} time - Optional time to wait
 * @param {Array} extraYes - Optional extra words to detect as Yes
 * @param {Array} extraNo - Optional extra words to detect as No
 * @returns {String} - Returns true or false
 */
async function verify(channel, user, { time = 30000, extraYes = [], extraNo = [] } = {}) {
  if (!channel || !user) return false;

  const filter = (res) => {
    const value = res.content.toLowerCase();
    return (
      (user ? res.author.id === user.id : true) &&
      (yes.includes(value) || no.includes(value) || extraYes.includes(value) || extraNo.includes(value))
    );
  };

  const verify = await channel.awaitMessages({
    filter,
    max: 1,
    time,
  });

  if (!verify.size) return 0;
  const choice = verify.first().content.toLowerCase();
  if (yes.includes(choice) || extraYes.includes(choice)) return true;
  if (no.includes(choice) || extraNo.includes(choice)) return false;
  return false;
}

/**
 * Convert text to the proper case.
 * @param {String} text - Text to convert.
 * @returns {String} - Returns text in proper case
 */
function toProperCase(text) {
  let newText = text;
  if (typeof text !== 'string') {
    newText = require('util').inspect(text, { depth: 1 });
  }
  return newText.replace(/([^\W_]+[^\s-]*) */g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

/**
 * Time to pause script
 * @param {Number} ms - Time to pause
 */
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Strip invites from messages.
 * @param {String} str - String to find invites in
 * @param {Boolean} guild - Boolean whether to check for guild invite type.
 * @param {Boolean} bot - Boolean whether to check for bot invite type.
 * @param {String} text - Text to replace the invite with
 * @returns {String} - String without invites in it
 */
function stripInvites(str, { guild = true, bot = true, text = '[redacted invite]' } = {}) {
  let string = str;
  if (guild) string = str.replace(inviteRegex, text);
  if (bot) string = str.replace(botInvRegex, text);
  return string;
}

/**
 *
 * @param {Message} context - Message or Interaction object
 * @param {String} memberString - memberStringing to use to find the member
 * @returns {?GuildMember} - Returns member object or false
 */
async function getMember(context, memberString) {
  if (!context.guild || !memberString) return false;
  await context.guild.members.fetch();

  if (context instanceof Message) {
    if (context.mentions.members.first()) return context.mentions.members.first();
  }

  memberString = memberString.replace(/[<#&>\s]+/g, '');
  return (
    context.guild.members.cache.find((m) => m.id === memberString) ||
    context.guild.members.cache.find((m) => m.displayName.toUpperCase() === memberString.toUpperCase()) ||
    context.guild.members.cache.find((m) => m.displayName.toUpperCase().includes(memberString.toUpperCase())) ||
    context.guild.members.cache.find((m) => m.user.username.toUpperCase() === memberString.toUpperCase()) ||
    context.guild.members.cache.find((m) => m.user.username.toUpperCase().includes(memberString.toUpperCase()))
  );
}

/**
 *
 * @param {Message} msg - Message object
 * @param {String} roleString - String to use to find the role
 * @returns {?GuildRole}
 */
function getRole(msg, roleString) {
  if (!msg.guild || !roleString) return false;
  if (msg.mentions.roles.first()) return msg.mentions.roles.first();

  roleString = roleString.replace(/[<#&>]+/g, '');
  return (
    msg.guild.roles.cache.find((r) => r.name === roleString) ||
    msg.guild.roles.cache.find((r) => r.id === roleString) ||
    msg.guild.roles.cache.find((r) => r.name.toLowerCase() === roleString.toLowerCase())
  );
}

/**
 *
 * @param {Message} context - Message or Interaction object
 * @param {String} channelString - string to use to find the channel
 * @returns {?GuildChannel}
 */
function getChannel(context, channelString) {
  if (!context.guild || !channelString) return false;

  if (context instanceof Message) {
    if (context.mentions.channels.first()) return context.mentions.channels.first();
  }

  channelString = channelString.replace(/[<#&>\s]+/g, '');
  return (
    context.guild.channels.cache.find((c) => c.id === channelString) ||
    context.guild.channels.cache.find((c) => c.name.toLowerCase() === channelString.toLowerCase()) ||
    context.guild.channels.cache.find((c) => c.name.toLowerCase().includes(channelString.toLowerCase()))
  );
}

/**
 *
 * @param {Number} userID - User ID to get warns for
 * @param {Message} msg - Message Object
 * @returns {?Array}
 */
async function getWarns(userID, msg) {
  const warns = await db.get(`servers.${msg.guild.id}.warns.warnings`);
  const userCases = [];
  if (warns) {
    Object.values(warns).forEach((val) => {
      if (val?.user === userID) {
        userCases.push(val);
      }
    });
  }
  if (!userCases) return;
  return userCases;
}

/**
 *
 * @param {Number} userID - User ID to get points for
 * @param {Message} msg - Message Object
 * @returns {Number}
 */
async function getTotalPoints(userID, msg) {
  const warns = await this.getWarns(userID, msg);
  let total = 0;
  if (warns) {
    Object.keys(warns).forEach((c) => {
      total += Number(warns[c].points);
    });
  }
  return total;
}

/**
 *
 * @param {String} str - String to clean
 * @param {Number} minLength - Minimum length of string
 * @param {Number} maxLength - Maximum length of string
 * @returns {String}
 */
function limitStringLength(str, minLength = 0, maxLength = 2000) {
  const string = String(str);
  if (string.length < maxLength) return string;
  return string.slice(minLength, maxLength - 3) + (str.length > maxLength - 3 ? '...' : '');
}

/**
 *
 * @param {String} haystack - Original text
 * @param {String} needle - Text to find in haystack
 * @param {String} replacement - What to replace needle with
 */
function replaceAll(haystack, needle, replacement) {
  return haystack.split(needle).join(replacement);
}

/**
 * Transform to string then removes secrets and pings from text.
 * @param {Client} client Bot Client
 * @param {String} text Text to clean
 */
async function clean(client, text) {
  if (!client || !text) throw new Error('Missing parameters');

  let newText = text;
  if (text && text.constructor.name === 'Promise') {
    newText = await text;
  }
  if (typeof text !== 'string') {
    newText = require('util').inspect(text, { depth: 1 });
  }

  newText = newText
    .replace(/`/g, '`' + String.fromCharCode(8203))
    .replace(/@/g, '@' + String.fromCharCode(8203))
    .replace(client.token, '*'.repeat(client.token.length));

  const config = client.config;
  const secrets = [
    config.token,
    config.github,
    config.OxfordID,
    config.OxfordKey,
    config.TMDb,
    config.BotListToken,
    config.OpenWeather,
    config.botLogsWebhookURL,
    config.youtubeCookie,
  ];

  for (let i = 0; i < secrets.length; i++) {
    newText = this.replaceAll(newText, secrets[i], '*'.repeat(secrets[i]?.length));
  }

  return newText;
}

/**
 * Random object from array
 * @param {Array} arr The array to use
 */
function random(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Get the join position if a member
 * @param {Number} id Member ID
 * @param {guild} guild Guild Object
 */
async function getJoinPosition(id, guild) {
  await guild.members.fetch();
  if (!guild.members.cache.get(id)) return;
  const array = [...guild.members.cache.values()];
  array.sort((a, b) => a.joinedAt - b.joinedAt);

  const result = array
    .map((m, i) => ({
      index: i,
      id: m.user.id,
    }))
    .find((m) => m.id === id);
  return result?.index + 1;
}

/**
 *
 * @param {Array} array
 * @param {*} attr
 * @param {*} value
 */
// Allows me to find the index of an object in an array, by the value of the propert{y,ies} of an object. Example: findWithAttr(obj, 'channelID', '593574887642234914');
function findWithAttr(array, attr, value) {
  for (let i = 0; i < array.length; i += 1) {
    if (array[i][attr] === value) {
      return i;
    }
  }
  return -1;
}

/**
 *
 * @param {Number} length
 */
function randomString(length) {
  let str = '';
  for (; str.length < length; ) str += Math.random().toString(36).substr(2);
  return str.substr(0, length);
}

/**
 *
 * @param {userID} userID
 * @param {Message} msg
 * @returns
 */
async function getTickets(userID, msg) {
  const tickets = await db.get(`servers.${msg.guild.id}.tickets`);
  const userTickets = [];
  if (tickets) {
    Object.values(tickets).forEach((val) => {
      if (val?.owner === userID) {
        userTickets.push(val);
      }
    });
  }
  if (!userTickets) return;
  return userTickets;
}

/**
 *
 * @param {Message} msg
 * @param {String} question
 * @param {Number} limit
 */
async function awaitReply(msg, question, limit = 60000) {
  const filter = (m) => m.author.id === msg.author.id;
  await msg.channel.send(question);
  try {
    const collected = await msg.channel.awaitMessages({ filter, max: 1, time: limit, errors: ['time'] });
    return collected.first().content;
  } catch (e) {
    return false;
  }
}

/**
 *
 * @param {*} context The interaction or message object
 * @param {String} desc The description for the error embed
 * @param {String} title The title for the error embed
 */
function errorEmbed(context, desc = 'An error has ocurred.', title = 'Error') {
  let author;

  if (context instanceof Message) {
    author = context.author;
  } else {
    author = context.user;
  }

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(context.settings.embedErrorColor)
    .setAuthor({ name: author.tag, iconURL: author.displayAvatarURL() })
    .setDescription(desc);

  if (context instanceof Message) {
    return context.channel.send({ embeds: [embed] });
  } else {
    return context.editReply({ embeds: [embed] });
  }
}

module.exports = {
  list,
  verify,
  toProperCase,
  wait,
  stripInvites,
  getMember,
  getRole,
  getChannel,
  getWarns,
  getTotalPoints,
  limitStringLength,
  replaceAll,
  clean,
  random,
  getJoinPosition,
  findWithAttr,
  randomString,
  getTickets,
  awaitReply,
  errorEmbed,
};
