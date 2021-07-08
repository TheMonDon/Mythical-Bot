const db = require('quick.db');
const yes = ['yes', 'y', 'ye', 'yeah', 'yup', 'yea', 'ya', 'hai', 'si', 'sí', 'oui', 'はい', 'correct'];
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
    const verify = await channel.awaitMessages(filter, {
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
    if (guild) str = str.replace(inviteRegex, text);
    if (bot) str = str.replace(botInvRegex, text);
    return str;
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
    return msg.mentions.channels.first() ||
    msg.guild.channels.cache.find(c => c.id === str) ||
    msg.guild.channels.cache.find(c => c.name.toLowerCase() === str.toLowerCase()) ||
    msg.guild.channels.cache.find(c => c.name.toLowerCase().includes(str.toLowerCase())) ||
    this.client.channels.cache.find(c => c.id === str) ||
    this.client.channels.cache.find(c => c.name.toLowerCase().includes(str.toLowerCase())) ||
    msg.channel;
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
        if (val.user === userID) {
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
    str = String(str);
    return str.slice(minLength, maxLength - 3) + (str.length > maxLength - 3 ? '...' : '');
  }

  /**
   *
   * @param {Client} client
   * @param {string} text
   */
  static async clean (client, text) {
    if (text && text.constructor.name === 'Promise') { text = await text; }
    if (typeof text !== 'string') { text = require('util').inspect(text, { depth: 1 }); }

    text = text
      .replace(/`/g, '`' + String.fromCharCode(8203))
      .replace(/@/g, '@' + String.fromCharCode(8203))
      .replace(client.token, 'mfa.VkO_2G4Qv3T--NO--lWetW_tjND--TOKEN--QFTm6YGtzq9PH--4U--tG0');

    return text;
  };

  /**
   *
   * @param {Array} arr
   */
  static random (arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /**
   *
   * @param {Number} id
   * @param {guild} guild
   */
  static async getJoinPosition (id, guild) {
    if (!guild.member(id)) return;

    await guild.members.fetch();
    const array = guild.members.cache.array();
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
};
