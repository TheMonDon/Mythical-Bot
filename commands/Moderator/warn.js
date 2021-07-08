const Command = require('../../base/Command.js');
const { getMember, randomString, getWarns, getTotalPoints } = require('../../base/Util.js');
const db = require('quick.db');
const DiscordJS = require('discord.js');

class warn extends Command {
  constructor (client) {
    super(client, {
      name: 'warn',
      description: 'Warns a member',
      usage: 'warn <user> <points> <reason>',
      category: 'Moderator',
      guildOnly: true,
      permLevel: 'Moderator'
    });
  }

  async run (msg, args) {
    let mem;
    let member = true;
    const p = msg.settings.prefix;

    if (!args || args.length < 3) {
      return msg.channel.send(`Incorrect Usage: ${p}warn <member> <points> <reason>`);
    } else {
      mem = getMember(msg, args[0]);
    }

    // Find the user by user ID
    if (!mem) {
      const ID = args[0].replace('<@', '').replace('>', '');
      try {
        mem = await this.client.users.fetch(ID);
        member = false;
      } catch (err) {
        return msg.channel.send(`Incorrect Usage: ${p}warn <member> <points> <reason>`);
      }
    }

    if (member ? mem.user.bot : mem.bot) return msg.channel.send('You can\'t warn a bot.');

    if (member) {
      if ((mem.roles.highest.position > msg.member.roles.highest.position - 1) && !msg.author.id === msg.guild.owner.user.id) {
        return msg.channel.send('You can\'t warn someone who has a higher role than you.');
      }
    }

    const points = parseInt(args[1], 10);
    if (isNaN(points)) return msg.channel.send(`Incorrect Usage: ${p}warn <member> <points> <reason>`);
    if (points < 0 || points > 1000) return msg.channel.send(`Incorrect Usage: ${p}warn <member> <0-1000 points> <reason>`);

    // Convert shorthand to fullhand for reason
    args.shift();
    args.shift();
    let reason = args.join(' ');
    if (['-ad', '-advertise', '-advertising', '-ads', '-promoting'].includes(reason)) {
      reason = 'Please do not attempt to advertise in our server.';
    } else if (['-botcommands', '-botcmds', '-botcmd', '-botchannel', '-botchan', '-botc'].includes(reason)) {
      reason = 'Please make sure that you use bot commands in the appropriate channels.';
    } else if (['-dmad', '-dmads', '-dmadvertise', '-privatead', '-pmad', '-pmads'].includes(reason)) {
      reason = 'Do not use our server as a platform to advertise to users in their DMs.';
    } else if (['-drama', '-trouble'].includes(reason)) {
      reason = 'We do not condone drama in our server, we want our server to be friendly for all users.';
    } else if (['-massdm', '-massmessage', '-massmsg'].includes(reason)) {
      reason = 'Please do not message many members in a short period of time.';
    } else if (['-massping', '-massmention', '-masstags', '-mping', '-mmention', '-mtag'].includes(reason)) {
      reason = 'Please do not mention users rapidly, or mention many users in a single message.';
    } else if (['-moderatorhelp', '-moderatormention', '-moderatorsupport', '-modhelp', '-modmention', '-modsupport'].includes(reason)) {
      reason = 'Please refrain from mentioning members of the Staff Team unless it is something pertaining to a rule being broken.';
    } else if (['-raiding', '-raids', '-raid'].includes(reason)) {
      reason = 'User partook in the raiding of the server';
    } else if (['-spam', '-spamming', '-shitposting'].includes(reason)) {
      reason = 'Please do not spam in our server, we like users to be able to talk appropiately within it.';
    } else if (['-dms', '-unsoliciteddms', '-unsolicteddm', '-unsolicitedmsg', '-privatemessage', '-pm'].includes(reason)) {
      reason = 'Please do not private message users unless they have explicitly agreed to it.';
    } else if (['-mention', '-tag', '-ping', '-mentions', '-tags', '-pings'].includes(reason)) {
      reason = 'Please do not mention users unless they have explicitly agreed to it.';
    }

    const ka = db.get(`servers.${msg.guild.id}.warns.kick`) || 8; // add an option to change this later, for now this is fine.
    const ba = db.get(`servers.${msg.guild.id}.warns.ban`) || 10;

    // Make sure that the ID doesn't exist on that server
    let warnID = randomString(5);
    while (db.get(`servers.${msg.guild.id}.warns.warnings.${warnID}`)) warnID = randomString(5);

    const otherWarns = getWarns(mem.id, msg);

    const warnAmount = getTotalPoints(mem.id, msg) + points;

    let status = 'warned';
    let color = 'ORANGE';
    if (warnAmount === ka) {
      status = 'kicked';
      color = 'GOLD';
    } else if (warnAmount >= ba) {
      status = 'banned';
      color = 'RED';
    }

    let otherCases = otherWarns.length > 0 ? otherWarns.map((w) => `\`${w.warnID}\``).join(', ') : 'No other cases.';

    if (!reason) reason = 'Automated Ban';
    if (!otherCases) otherCases = 'No other cases';

    const logChan = db.get(`servers.${msg.guild.id}.logging.channel`);

    // Send the embed to the users DMS
    const userEm = new DiscordJS.MessageEmbed()
      .setColor(color)
      .setAuthor(msg.author.username, msg.author.displayAvatarURL())
      .setFooter(`Issued in ${msg.guild.name}`)
      .setTitle(`You have been ${status}`)
      .addField('Case ID', `\`${warnID}\``, true)
      .addField('Points', `${points} points (Total: ${warnAmount} points)`, true)
      .addField('Other Cases', otherCases, true)
      .addField('Reason', reason, false);
    const um = await mem.send(userEm).catch(() => null);

    const logEmbed = new DiscordJS.MessageEmbed()
      .setColor(color)
      .setFooter(`${msg.author.tag} • User ID: ${mem.id}`)
      .setTitle(`User has been ${status}`)
      .addField('User', `${mem} (${mem.id})`, true)
      .addField('Moderator', `${msg.author.tag} (${msg.author.id})`, true)
      .addField('Case ID', `\`${warnID}\``, true)
      .addField('Points', `${points} points (Total: ${warnAmount} points)`, true)
      .addField('Other Cases', otherCases, true)
      .addField('Reason', reason, false);
    if (!um) logEmbed.setFooter(`Failed to message the user in question • User ID: ${mem.id}`);
    const logMessage = logChan ? await msg.guild.channels.cache.get(logChan).send(logEmbed) : await msg.channel.send(logEmbed);

    const opts = { messageURL: logMessage.url, mod: msg.author.id, points, reason, timestamp: Date.now(), user: mem.id, warnID };
    db.set(`servers.${msg.guild.id}.warns.warnings.${warnID}`, opts);

    if (warnAmount >= ba) {
      if (!msg.guild.me.permissions.has('BAN_MEMBERS')) return msg.channel.send('The bot does not have permission to ban members.');
      msg.guild.members.ban(mem.id, { reason }).catch(() => null); // Ban wether they are in the guild or not.
    } else if (warnAmount >= ka) {
      if (!msg.guild.me.permissions.has('KICK_MEMBERS')) return msg.channel.send('The bot does not have permission to kick members.');
      const member = msg.guild.member(mem.id);
      if (member) member.kick(reason).catch(() => null); // Kick them if they are in the guild
    }
  }
}

module.exports = warn;
