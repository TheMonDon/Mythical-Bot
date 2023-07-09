const Command = require('../../base/Command.js');
const db = require('quick.db');
const { EmbedBuilder } = require('discord.js');
const { stripIndents } = require('common-tags');

class Warn extends Command {
  constructor(client) {
    super(client, {
      name: 'warn',
      description: 'Warns a member',
      longDescription: stripIndents`
        Warn system that will kick or ban a user depending on the points they have.
        Users are kicked when they reach 8 points, or banned when they reach 10. (Change with \`setup\` command)`,
      usage: 'Warn <User> <Points> <Reason>',
      category: 'Moderator',
      permLevel: 'Moderator',
      guildOnly: true,
    });
  }

  async run(msg, args) {
    let mem;
    let member = true;
    let logMessage;
    const usage = `Incorrect Usage: ${msg.settings.prefix}warn <User> <Points Kick:${msg.settings.warnKickPoints} | Ban:${msg.settings.warnBanPoints}> <Reason>`;

    await msg.delete();
    if (!args || args.length < 3) return msg.channel.send(usage);
    mem = await this.client.util.getMember(msg, args[0]);

    // Find the user by user ID
    if (!mem) {
      const ID = args[0].replace('<@', '').replace('>', '');
      try {
        mem = await this.client.users.fetch(ID);
        member = false;
      } catch (err) {
        return msg.channel.send(usage);
      }
    }

    if (member ? mem.user.bot : mem.bot) return msg.channel.send("You can't warn a bot.");

    if (member) {
      const owner = await msg.guild.fetchOwner();
      if (mem.roles.highest.position > msg.member.roles.highest.position - 1 || msg.author.id !== owner.user.id) {
        return msg.channel.send("You can't warn someone who has a higher role than you.");
      }
    }

    // Check if points is a number and is between 0 and 1000
    const points = parseInt(args[1], 10);
    if (isNaN(points)) return msg.channel.send(usage);
    if (points < 0 || points > 1000)
      return msg.channel.send(`Incorrect Usage: ${msg.settings.prefix}warn <member> <0-1000 points> <reason>`);

    // Convert shorthand to fullhand for reason
    args.shift();
    args.shift();
    let reason = args.join(' ');

    const reasonTest = reason.toLowerCase();
    if (['-ad', '-advertise', '-advertising', '-ads'].includes(reasonTest)) {
      reason = 'Please do not attempt to advertise in our server.';
    } else if (['-botcommands', '-botcmds', '-botcmd', '-botchannel', '-botchan'].includes(reasonTest)) {
      reason = 'Please make sure that you use bot commands in the appropriate channels.';
    } else if (['-dmad', '-dmads', '-dmadvertise', '-privatead', '-pmad', '-pmads'].includes(reasonTest)) {
      reason = 'Do not use our server as a platform to advertise to users in their DMs.';
    } else if (['-drama', '-trouble'].includes(reasonTest)) {
      reason = 'We do not condone drama in our server, we want our server to be friendly for all users.';
    } else if (['-massdm', '-massmessage', '-massmsg'].includes(reasonTest)) {
      reason = 'Please do not message many members in a short period of time.';
    } else if (['-massping', '-massmention', '-masstags', '-mping', '-mmention', '-mtag'].includes(reasonTest)) {
      reason = 'Please do not mention users rapidly, or mention many users in a single message.';
    } else if (
      ['-moderatorhelp', '-moderatormention', '-moderatorsupport', '-modhelp', '-modmention', '-modsupport'].includes(
        reasonTest,
      )
    ) {
      reason =
        'Please refrain from mentioning members of the Staff Team unless it is something pertaining to a rule being broken.';
    } else if (['-raiding', '-raids', '-raid'].includes(reasonTest)) {
      reason = 'User partook in the raiding of the server';
    } else if (['-spam', '-spamming', '-shitposting'].includes(reasonTest)) {
      reason = 'Please do not spam in our server, we like users to be able to talk appropriately within it.';
    } else if (
      ['-dms', '-unsoliciteddms', '-unsolicteddm', '-unsolicitedmsg', '-privatemessage', '-pm'].includes(reasonTest)
    ) {
      reason = 'Please do not private message users unless they have explicitly agreed to it.';
    } else if (['-mention', '-tag', '-ping', '-mentions', '-tags', '-pings'].includes(reasonTest)) {
      reason = 'Please do not mention users unless they have explicitly agreed to it.';
    }

    // Grab the settings for the server
    const ka = db.get(`servers.${msg.guild.id}.warns.kick`) || 8;
    const ba = db.get(`servers.${msg.guild.id}.warns.ban`) || 10;
    const logChan = db.get(`servers.${msg.guild.id}.warns.channel`);

    // Make sure that the ID doesn't exist on that server
    let warnID = this.client.util.randomString(5);
    while (db.has(`servers.${msg.guild.id}.warns.warnings.${warnID}`)) warnID = this.client.util.randomString(5);

    // Get the users current warns and total points
    const otherWarns = this.client.util.getWarns(mem.id, msg);
    const warnAmount = this.client.util.getTotalPoints(mem.id, msg) + points;

    // Set the status and color of the embed
    let status = 'warned';
    let color = ' #FFA500';
    if (warnAmount === ka) {
      status = 'kicked';
      color = '#FFD700';
    } else if (warnAmount >= ba) {
      status = 'banned';
      color = ' #FF0000';
    }

    // Check if they have other cases
    let otherCases = otherWarns.length > 0 ? otherWarns.map((w) => `\`${w.warnID}\``).join(', ') : 'No other cases.';

    if (!reason) reason = 'Automated Ban';
    if (!otherCases) otherCases = 'No other cases';

    const authorName = msg.author.discriminator === '0' ? msg.author.username : msg.author.tag;
    // Send the embed to the users DMS
    const userEmbed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({ name: authorName, iconURL: msg.author.displayAvatarURL() })
      .setTitle(`You have been ${status}.`)
      .addFields([
        { name: 'Case ID', value: `\`${warnID}\`` },
        { name: 'Points', value: `${points} points (Total: ${warnAmount} points)` },
        { name: 'Other Cases', value: otherCases },
        { name: 'Reason', value: reason, inline: false },
      ])
      .setFooter({ text: `Issued in: ${msg.guild.name}` });
    const userMessage = await mem.send({ embeds: [userEmbed] }).catch(() => null);

    // Create the embed for the logs channel
    const logEmbed = new EmbedBuilder()
      .setColor(color)
      .setFooter({ text: `${authorName} • User ID: ${mem.id}` })
      .setTitle(`User has been ${status}.`)
      .addFields([
        { name: 'User', value: `${mem} (${mem.id})`, inline: true },
        { name: 'Moderator', value: `${authorName} (${msg.author.id})`, inline: true },
        { name: 'Case ID', value: `\`${warnID}\``, inline: true },
        { name: 'Points', value: `${points} points (Total: ${warnAmount} points)`, inline: true },
        { name: 'Other Cases', value: otherCases, inline: true },
        { name: 'Reason', value: reason, inline: false },
      ]);
    if (!userMessage) logEmbed.setFooter({ text: 'Failed to send a DM to the user. (User has DMs disabled)' });

    // Check if the logs channel exists and send the message
    if (logChan) {
      const channelEmbed = new EmbedBuilder()
        .setColor(color)
        .setFooter({ text: `${authorName} • User ID: ${mem.id}` })
        .setTitle(`User has been ${status}`)
        .addFields([{ name: 'User', value: `${mem} (${mem.id})` }])
        .setDescription('Full info posted inside the log channel.');

      logMessage = await msg.guild.channels.cache.get(logChan).send({ embeds: [logEmbed] });

      msg.channel.send({ embeds: [channelEmbed] }).then((embed) => {
        setTimeout(() => embed.delete(), 30000);
      });
    } else {
      logMessage = await msg.channel.send({ embeds: [logEmbed] });
    }

    // Add the warn to the database
    const opts = {
      messageURL: logMessage.url,
      mod: msg.author.id,
      points,
      reason,
      timestamp: Date.now(),
      user: mem.id,
      warnID,
    };
    db.set(`servers.${msg.guild.id}.warns.warnings.${warnID}`, opts);

    // Check if they should be banned or kicked
    if (warnAmount >= ba) {
      if (!msg.guild.members.me.permissions.has('BenMembers'))
        return msg.channel.send('The bot does not have permission to ban members.');
      msg.guild.members.ban(mem.id, { reason }).catch(() => null); // Ban wether they are in the guild or not.
    } else if (warnAmount >= ka) {
      if (!msg.guild.members.me.permissions.has('KickMembers'))
        return msg.channel.send('The bot does not have permission to kick members.');
      const member = msg.guild.members.cache.get(mem.id);
      if (member) member.kick(reason).catch(() => null); // Kick them if they are in the guild
    }
  }
}

module.exports = Warn;
