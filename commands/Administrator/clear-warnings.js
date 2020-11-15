const Command = require('../../base/Command.js');
const db = require('quick.db');
const DiscordJS = require('discord.js');

class deletewarning extends Command {
  constructor(client) {
    super(client, {
      name: 'clear-warnings',
      description: 'Delete all the warnings of a specific user.',
      usage: 'clear-warnings <user>',
      category: 'Administrator',
      guildOnly: true,
      permLevel: 'Administrator',
      aliases: ['cw', 'clearwarns', 'clearwarnings', 'cwarns']
    });
  }

  async run(msg, args) {
    const p = msg.settings.prefix;
    if (!args || args.length < 1) return msg.channel.send(`Incorrect Usage: ${p}clear-warnings <user>`);
    const text = args.join(' ');
    let mem;

    mem = msg.mentions.members.first() ||
      msg.guild.members.cache.find(m => m.id === text) ||
      msg.guild.members.cache.find(m => m.displayName.toUpperCase() === `${text.toUpperCase()}`) ||
      msg.guild.members.cache.find(m => m.user.username.toUpperCase() === `${text.toUpperCase()}`) ||
      msg.guild.members.cache.find(m => m.user.username.toLowerCase().includes(`${text.toLowerCase()}`));

    // Find the user by user ID
    if (!mem) {
      const ID = args[0].replace('<@', '').replace('>', '');
      try {
        mem = await this.client.users.fetch(ID);
      } catch (err) {
        return msg.channel.send(`Incorrect Usage: ${p}clear-warnings <user>`);
      }
    }

    const otherWarns = getWarns(mem.id, msg);
    const previousPoints = getTotalPoints(mem.id, msg);

    if (!otherWarns || otherWarns.length < 1) return msg.channel.send('That user has no warnings.');

    for (const i of otherWarns) {
      db.delete(`servers.${msg.guild.id}.warns.warnings.${i.warnID}`)
    }

    if (previousPoints >= 10) {
      if (!msg.guild.me.permissions.has('BAN_MEMBERS')) msg.channel.send('The bot does not have Ban_Members permission to unban the user.');
      await msg.guild.members.unban(userID).catch(() => null);
    }

    const otherCases = otherWarns.map((w) => `\`${w.warnID}\``).join(', ');

    const em = new DiscordJS.MessageEmbed()
      .setDescription(`${msg.author.tag} has cleared all the warnings from a user.`)
      .setColor('ORANGE')
      .addField('From User', `${mem} (${mem.id})`, true)
      .addField('Cleared Cases', otherCases, true);
    mem.send(em).catch(() => null)
    return msg.channel.send(em);
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

module.exports = deletewarning;