const db = require('quick.db');
const yes = ['yes', 'y', 'ye', 'yeah', 'yup', 'yea', 'ya', 'hai', 'si', 'sí', 'oui', 'はい', 'correct', 'sure'];
const no = ['no', 'n', 'nah', 'nope', 'nop', 'iie', 'いいえ', 'non', 'fuck off'];
const inviteRegex = /(https?:\/\/)?(www\.|canary\.|ptb\.)?discord(\.gg|(app)?\.com\/invite|\.me)\/([^ ]+)\/?/gi;
const botInvRegex = /(https?:\/\/)?(www\.|canary\.|ptb\.)?discord(app)?\.com\/(api\/)?oauth2\/authorize\?([^ ]+)\/?/gi;

module.exports = class Util {
  static list (arr, conj = 'and') {
    const len = arr.length;
    if (len === 0) return '';
    if (len === 1) return arr[0];
    return `${arr.slice(0, -1).join(', ')}${len > 1 ? `${len > 2 ? ',' : ''} ${conj} ` : ''}${arr.slice(-1)}`;
  }

  static async verify (channel, user, { time = 30000, extraYes = [], extraNo = [] } = {}) {
    const filter = res => {
      const value = res.content.toLowerCase();
      return (user ? res.author.id === user.id : true) && (yes.includes(value) || no.includes(value) || extraYes.includes(value) || extraNo.includes(value));
    };
    const verify = await channel.awaitMessages({
      filter,
      max: 1,
      time
    });
    if (!verify.size) return 0;
    const choice = verify.first().content.toLowerCase();
    if (yes.includes(choice) || extraYes.includes(choice)) return true;
    if (no.includes(choice) || extraNo.includes(choice)) return false;
    return false;
  }

  /**
   *
   * @param {string} text
   */
  static toProperCase (text) {
    return text.replace(/([^\W_]+[^\s-]*) */g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
  }

  /**
   *
   * @param {Number} ms
   */
  static wait (ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static stripInvites (str, { guild = true, bot = true, text = '[redacted invite]' } = {}) {
    let string = str;
    if (guild) string = str.replace(inviteRegex, text);
    if (bot) string = str.replace(botInvRegex, text);
    return string;
  }

  /**
   *
   * @param {Message} msg
   * @param {string} str
   */
  static getMember (msg, str) {
    if (!msg.guild) return false;
    return msg.mentions.members.first() ||
    msg.guild.members.cache.find(m => m.id === str) ||
    msg.guild.members.cache.find(m => m.displayName.toUpperCase() === str.toUpperCase()) ||
    msg.guild.members.cache.find(m => m.user.username.toUpperCase() === str.toUpperCase()) ||
    msg.guild.members.cache.find(m => m.user.username.toUpperCase().includes(str.toUpperCase())) ||
    msg.guild.members.cache.find(m => m.user.tag === str);
  }

  /**
   *
   * @param {Message} msg
   * @param {string} str
   */
  static getRole (msg, str) {
    if (!msg.guild) return false;
    return msg.mentions.roles.first() ||
    msg.guild.roles.cache.find(r => r.name === str) ||
    msg.guild.roles.cache.find(r => r.id === str) ||
    msg.guild.roles.cache.find(r => r.name.toLowerCase() === str.toLowerCase()) ||
    msg.guild.roles.cache.find(r => r.id === str.replace('<@&', '').replace('>', ''));
  }

  /**
   *
   * @param {Message} msg
   * @param {string} str
   */
  static getChannel (msg, str) {
    if (!msg.guild) return false;
    return msg.mentions.channels.first() ||
    msg.guild.channels.cache.find(c => c.id === str) ||
    msg.guild.channels.cache.find(c => c.name.toLowerCase() === str.toLowerCase()) ||
    msg.guild.channels.cache.find(c => c.name.toLowerCase().includes(str.toLowerCase()));
  }

  /**
   *
   * @param {Number} userID
   * @param {Message} msg
   */
  static getWarns (userID, msg) {
    const warns = db.get(`servers.${msg.guild.id}.warns.warnings`);
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
   * @param {Number} userID
   * @param {Message} msg
   */
  static getTotalPoints (userID, msg) {
    const warns = Util.getWarns(userID, msg);
    let total = 0;
    if (warns) {
      Object.keys(warns).forEach(c => {
        total += Number(warns[c].points);
      });
    }
    return total;
  }

  /**
   *
   * @param {string} str
   * @param {Number} minLength
   * @param {Number} maxLength
   */
  static cleanString (str, minLength = 0, maxLength = 2000) {
    const string = String(str);
    return string.slice(minLength, maxLength - 3) + (str.length > maxLength - 3 ? '...' : '');
  }

  /**
   *
   * @param {String} haystack Original text
   * @param {String} needle Text to find in haystack
   * @param {String} replacement What to replace needle with
   */
  static replaceAll (haystack, needle, replacement) {
    return haystack.split(needle).join(replacement);
  }

  /**
   * Transform to string then removes secrets and pings from text.
   * @param {Client} client Bot Client
   * @param {String} text Text to clean
   */
  static async clean (client, text) {
    let newText;
    if (text && text.constructor.name === 'Promise') { newText = await text; }
    if (typeof text !== 'string') { newText = require('util').inspect(text, { depth: 1 }); }

    const config = client.config;
    const secrets = [
      config.token,
      config.github,
      config.owlKey,
      config.OxfordKey,
      config.TMDb,
      config.mysqlUsername,
      config.mysqlPassword
    ];
    for (let i = 0; i < secrets.length; i++) {
      newText = Util.replaceAll(newText, secrets[i], '*'.repeat(secrets[i].length));
    }

    newText = newText
      .replace(/`/g, '`' + String.fromCharCode(8203))
      .replace(/@/g, '@' + String.fromCharCode(8203))
      .replace(client.token, 'mfa.VkO_2G4Qv3T--NO--lWetW_tjND--TOKEN--QFTm6YGtzq9PH--4U--tG0');

    return newText;
  };

  /**
   * Random object from array
   * @param {Array} arr The array to use
   */
  static random (arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /**
   * Get the join position if a member
   * @param {Number} id Member ID
   * @param {guild} guild Guild Object
   */
  static async getJoinPosition (id, guild) {
    await guild.members.fetch();
    if (!guild.members.cache.get(id)) return;
    const array = [...guild.members.cache.values()];
    array.sort((a, b) => a.joinedAt - b.joinedAt);

    const result = array.map((m, i) => ({
      index: i,
      id: m.user.id
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
  static findWithAttr (array, attr, value) {
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
  static randomString (length) {
    let str = '';
    for (; str.length < length;) str += Math.random().toString(36).substr(2);
    return str.substr(0, length);
  };

  /**
   *
   * @param {userID} userID
   * @param {Message} msg
   * @returns
   */
  static getTickets (userID, msg) {
    const tickets = db.get(`servers.${msg.guild.id}.tickets`);
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
};
