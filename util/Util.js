const yes = [
  'yes',
  'y',
  'ye',
  'yeah',
  'yup',
  'yea',
  'ya',
  'correct',
  'sure',
  'hell yeah',
  'ok',
  'okay',
  'si',
  'evet',
  'true',
];
const no = ['no', 'n', 'nah', 'nope', 'fuck off', 'nada', 'cancel', 'stop', 'nuh uh', 'nu', 'fuck no', 'false'];
const botInvRegex = /(https?:\/\/)?(www\.|canary\.|ptb\.)?discord(app)?\.com\/(api\/)?oauth2\/authorize\?([^ ]+)\/?/gi;
const inviteRegex = /(https?:\/\/)?(www\.|canary\.|ptb\.)?discord(\.gg|(app)?\.com\/invite|\.me)\/([^ ]+)\/?/gi;

const { getColorFromURL } = require('color-thief-node');
const { Message, EmbedBuilder } = require('discord.js');
const { createCanvas, loadImage, registerFont } = require('canvas');
const tinycolor = require('tinycolor2');
const { QuickDB } = require('quick.db');
const rgbHex = require('rgb-hex');
const path = require('path');
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
async function verify(channel, user, { time = 120000, extraYes = [], extraNo = [] } = {}) {
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
  return newText.replace(/([^\W_]+[^\s-]*) */g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
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
 * @param {*} context - Message or Interaction object
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
 * @param {*} context - Message or Interaction object
 * @param {String} roleString - String to use to find the role
 * @returns {?GuildRole}
 */
function getRole(context, roleString) {
  if (!context.guild || !roleString) return false;
  if (context.mentions?.roles.first()) return context.mentions.roles.first();

  roleString = roleString.replace(/[<#&>]+/g, '');
  return (
    context.guild.roles.cache.find((r) => r.name === roleString) ||
    context.guild.roles.cache.find((r) => r.id === roleString) ||
    context.guild.roles.cache.find((r) => r.name.toLowerCase() === roleString.toLowerCase())
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
 * @param {String} str - String to limit length of
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
    config.TMDb,
    config.BotListToken,
    config.OpenWeather,
    config.botLogsWebhookURL,
    config.youtubeCookie,
    config.Wordnik,
  ];

  for (let i = 0; i < secrets.length; i++) {
    newText = this.replaceAll(newText, secrets[i], '*'.repeat(secrets[i]?.length));
  }

  return newText;
}

/**
 * Random object from array
 * @param {Array} array The array to use
 */
function random(array) {
  return array[Math.floor(Math.random() * array.length)];
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
 * @param {Message} context
 */
async function getTickets(userID, context) {
  const tickets = await db.get(`servers.${context.guild.id}.tickets`);
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
 * @param {*} context - Message or Interaction object
 * @param {String} question
 * @param {Number} limit
 */
async function awaitReply(context, question, time = 60000) {
  let filter;
  if (context instanceof Message) {
    filter = (m) => m.author.id === context.author.id;
  } else {
    filter = (i) => i.user.id === context.user.id;
  }

  if (question) {
    await context.channel.send(question);
  }

  try {
    const collected = await context.channel.awaitMessages({ filter, max: 1, time, errors: ['time'] });
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
function errorEmbed(context, desc = 'An error has occurred.', title = 'Error') {
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
    return context.editReply({ content: null, embeds: [embed] });
  }
}

async function generateTrackStartCard({ title, artist, thumbnailUrl, duration, requestedBy, queueLength }) {
  registerFont(path.join(__dirname, '../resources/fonts/seguiemj.ttf'), {
    family: 'Segoe UI Emoji',
  });

  // ctx: your canvas context
  // x, y: position of the thumbnail
  // w, h: width and height of the thumbnail

  async function drawRoundedThumbnail(ctx, imageUrl, x, y, w, h, radius = 20) {
    const img = await loadImage(imageUrl);

    // Save current context before clipping
    ctx.save();

    // Shadow for "floating" effect
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 6;

    // Clip to rounded rectangle
    ctx.beginPath();
    roundedRect(ctx, x, y, w, h, radius);
    ctx.clip();

    // Draw the image inside clipped area
    ctx.drawImage(img, x, y, w, h);

    // Restore context to remove clipping and shadow for next draw
    ctx.restore();
  }

  function roundedRect(ctx, x, y, width, height, radius) {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  const width = 1200;
  const height = 360;
  const thumbnailSize = 300;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.textDrawingMode = 'glyph';

  // Get dominant RGB color and convert to hex
  const rgb = await getColorFromURL(thumbnailUrl);
  const hex = `#${rgbHex(rgb[0], rgb[1], rgb[2])}`;
  const dominantColor = tinycolor({ r: rgb[0], g: rgb[1], b: rgb[2] });

  // Fill background with dominant color
  const backgroundColor = tinycolor(hex).setAlpha(0.7).toRgbString();
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);

  // OPTIONAL: Add slight overlay for readability
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(0, 0, width, height);

  // Load and draw album art
  const thumbnailY = (height - thumbnailSize) / 2; // centers vertically
  await drawRoundedThumbnail(ctx, thumbnailUrl, 30, thumbnailY, thumbnailSize, thumbnailSize);

  const paddingLeft = 350;
  const top = 80;

  function fitTextToWidth(ctx, text, maxWidth, initialSize = 48, minSize = 18, fontFamily = 'Segoe UI Emoji') {
    let fontSize = initialSize;

    do {
      ctx.font = `${fontSize}px ${fontFamily}`;
      const { width } = ctx.measureText(text);
      if (width <= maxWidth || fontSize <= minSize) break;
      fontSize--;
    } while (fontSize > minSize);

    return fontSize;
  }

  const padding = 50;
  const textStartX = thumbnailSize + padding;
  const maxTextWidth = width - textStartX - padding;

  // Get a readable font color (white or black)
  const titleFontColor = dominantColor.isLight() ? '#000000' : '#FFFFFF';
  const artistFontColor = dominantColor.isLight() ? '#121212' : '#CCCCCC';
  const otherFontColor = dominantColor.isLight() ? '#1a1a1a' : '#bbbbbb';

  // Title
  const dynamicFontSize = fitTextToWidth(ctx, title, maxTextWidth);
  ctx.font = `${dynamicFontSize}px 'Segoe UI Emoji'`;
  ctx.fillStyle = titleFontColor;
  ctx.fillText(title, textStartX, 80);

  // Artist
  ctx.font = "36px 'Segoe UI Emoji'";
  ctx.fillStyle = artistFontColor;
  ctx.fillText(artist, paddingLeft, top + 50);

  // Duration
  ctx.font = "28px 'Segoe UI Emoji'";
  ctx.fillStyle = otherFontColor;
  ctx.fillText(`⏱️ Duration: ${duration}`, paddingLeft, top + 110);

  // Requested By
  ctx.fillText(`👤 Requested By: ${requestedBy}`, paddingLeft, top + 160);

  // Tracks in Queue
  ctx.fillText(`🎶 Tracks in Queue: ${queueLength}`, paddingLeft, top + 210);

  return canvas.toBuffer('image/png');
}

/**
 * Generates a Now Playing image card as a buffer
 * @param {object} options
 * @param {object} options.song - The song object from lavalink
 * @param {number} options.position - Current playback position in ms
 * @param {object} options.requester - Discord user who requested the song
 * @param {string} options.repeatMode - Player repeat mode (None, Song, Queue, etc.)
 * @param {string} options.username - The display name of the user running the command
 * @param {string} options.avatarURL - The display avatar URL of the user
 * @returns {Promise<Buffer>}
 */
async function generateNowPlayingCard({ song, position, requester, repeatMode, username, avatarURL }) {
  registerFont(path.join(__dirname, '../resources/fonts/seguiemj.ttf'), {
    family: 'Segoe UI Emoji',
  });

  const canvas = createCanvas(1200, 360);
  const ctx = canvas.getContext('2d');

  // Get dominant color
  const rgb = await getColorFromURL(song.info.artworkUrl);
  const dominantColor = `#${rgbHex(rgb.join(','))}`;
  ctx.fillStyle = dominantColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Optional overlay for readability
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw artwork
  const artwork = await loadImage(song.info.artworkUrl);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(30, 30, 300, 300, 30);
  ctx.clip();
  ctx.drawImage(artwork, 30, 30, 300, 300);
  ctx.restore();

  // Determine text color
  const textColor = tinycolor.mostReadable(dominantColor, ['#ffffff', '#000000']).toHexString();
  ctx.fillStyle = textColor;

  // Title
  let title = song.info.title;
  if (song.info.sourceName === 'youtube') {
    title = title.replace(/^.*?- */, '');
  }

  ctx.font = "bold 48px 'Segoe UI Emoji'";
  ctx.fillText(title, 360, 80);

  // Author
  ctx.font = "36px 'Segoe UI Emoji'";
  ctx.fillText(song.info.author, 360, 130);

  // Progress Bar
  const duration = song.info.duration;
  const progress = Math.round((position / duration) * 20);
  const bar = '▬'.repeat(progress) + '🔘' + '▬'.repeat(20 - progress);

  ctx.font = "32px 'Segoe UI Emoji'";
  ctx.fillText(bar, 360, 200);

  const formatTime = (ms) => {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  ctx.font = '28px Arial';
  ctx.fillText(`${formatTime(position)} / ${formatTime(duration)}`, 360, 240);

  // Requested by
  ctx.font = '28px Arial';
  ctx.fillText(`Requested By: ${requester.tag}`, 360, 290);

  // Repeat mode
  ctx.font = '24px Arial';
  ctx.fillText(`Repeat Mode: ${repeatMode}`, 360, 330);

  // Avatar
  const avatar = await loadImage(avatarURL);
  ctx.beginPath();
  ctx.arc(1140, 60, 40, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(avatar, 1100, 20, 80, 80);

  return canvas.toBuffer();
}

module.exports = {
  yes,
  no,
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
  generateTrackStartCard,
  generateNowPlayingCard,
};
