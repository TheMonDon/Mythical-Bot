const Command = require('../../base/Command.js');
const db = require('quick.db');
const DiscordJS = require('discord.js');
const moment = require('moment');

class warnings extends Command {
  constructor(client) {
    super(client, {
      name: 'warnings',
      description: 'View all your warnings, mods+ can view others warnings.',
      usage: 'warnings [member]',
      category: 'General',
      guildOnly: true,
      aliases: ['warns', 'mywarns', 'mycases']
    });
  }

  async run(msg, args, level) {
    const server = msg.guild;
    const warns = [];
    let mem;

    if (!args || args.length < 1) {
      mem = msg.author;
    } else {
      const text = args.join(' ');

      mem = msg.mentions.members.first() ||
        server.members.cache.find(m => m.id === `${text}`) ||
        server.members.cache.find(m => m.displayName.toUpperCase() === `${text.toUpperCase()}`) ||
        server.members.cache.find(m => m.user.username.toUpperCase() === `${text.toUpperCase()}`) ||
        server.members.cache.find(m => m.user.username.toLowerCase().includes(`${text.toLowerCase()}`));

      // Find the user by user ID
      if (!mem) {
        const ID = args[0].replace('<@', '').replace('>', '');
        try {
          mem = await this.client.users.fetch(ID);
        } catch (err) {
          mem = msg.author;
        }
      }

      mem = level > 0 ? mem : msg.author;
    }

    const otherWarns = getWarns(mem.id, msg);
    const totalPoints = getTotalPoints(mem.id, msg);

    if (otherWarns) {
      let otherCases = otherWarns.length > 0 ? otherWarns.map((w) => `\`${w.warnID}\``).join(', ') : 'No other cases.';
      if (!otherCases) otherCases = 'No other Cases';

      for (const i of otherWarns) {
        const data = db.get(`servers.${msg.guild.id}.warns.warnings.${i.warnID}`);
        warns.push(`\`${i.warnID}\` - ${data.points} pts - ${cleanString(data.reason, 0, 24)} - `
          + `${moment(Number(data.timestamp)).format('LLL')}`);
      }
    }
    const warnName = mem.user ? mem.user.username : mem.username;
    const warnImage = mem.user ? mem.user.displayAvatarURL() : mem.displayAvatarURL();
    
    const em = new DiscordJS.MessageEmbed()
      .setAuthor(warnName, warnImage)
      .setColor('ORANGE')
      .setTitle(`Total Warning Points: ${totalPoints}`)
      .setDescription(warns.length ? warns.join('\n') : 'This user is squeaky clean.');
    msg.channel.send(em);
  }
}

function getWarns(userID, msg) {
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

function getTotalPoints(userID, msg) {
  const warns = getWarns(userID, msg);
  let total = 0;
  if (warns) {
    Object.keys(warns).forEach(c => {
      total += Number(warns[c].points);
    });
  }
  return total;
}

function cleanString(str, minLength = 0, maxLength = 1024) {
  str = String(str);
  return str.slice(minLength, maxLength - 3) + (str.length > maxLength - 3 ? '...' : '');
}

module.exports = warnings;