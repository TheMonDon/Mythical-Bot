const Command = require('../../base/Command.js');
const db = require('quick.db');
const DiscordJS = require('discord.js');

class unban extends Command {
  constructor(client) {
    super(client, {
      name: 'unban',
      description: 'Unban a member',
      usage: 'unban <userID> [reason]',
      category: 'Moderator',
      guildOnly: true,
    });
  }

  async run(msg, args) {
    if (!msg.member.permissions.has('BAN_MEMBERS')) return msg.channel.send('You are missing the BAN_MEMBERS permission.');
    if (!msg.guild.me.permissions.has('BAN_MEMBERS')) return msg.channel.send('The bot is missing BAN_MEMBERS permission.');

    if (!args || args.length < 1) return msg.channel.send(`Incorrect Usage: ${msg.settings.prefix}unban <userID> [reason]`);
    const log_chan = db.get(`servers.${msg.guild.id}.logging.channel`);

    const regex = new RegExp(/\d+/g);
    const userID = args[0];
    args.shift();
    const reason = args.join(' ');

    if (!userID.matches(regex)) return msg.channel.send(`Errpr: Please enter a valid User ID. \nInput: ${userID}`);

    const embed = new DiscordJS.MessageEmbed();
    if (msg.guild.me.permissions.has('MANAGE_MESSAGES')) msg.delete();

    try {
      const banList = await msg.guild.fetchBans();
      const bannedUser = banList.find(user => user.id === userID);

      if (!bannedUser) return msg.channel.send(`The user with the ID ${userID} is not banned.`);

      msg.guild.unban(userID, reason)
        .then(unbanP => {
          embed.setTitle('Member Unbanned');
          embed.setAuthor(msg.member.displayName, msg.author.displayAvatarURL());
          embed.setColor('GREEN');
          embed.addField('User', unbanP, true);
          embed.addField('Unbanned By', msg.member, true);
          embed.addField('Reason', reason, true);
          embed.setFooter(`ID: ${unbanP.id}`);
          embed.setTimestamp();
          if (log_chan) msg.guild.channels.cache.get(log_chan).send(embed);

          return msg.channel.send(embed);
        });
    } catch (err) {
      console.error(err);
    }
  }
}

module.exports = unban;