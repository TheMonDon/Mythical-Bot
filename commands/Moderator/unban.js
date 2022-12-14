const Command = require('../../base/Command.js');
const db = require('quick.db');
const { EmbedBuilder } = require('discord.js');

class Unban extends Command {
  constructor (client) {
    super(client, {
      name: 'Unban',
      description: 'Unban a member',
      usage: 'Unban <userID> [reason]',
      category: 'Moderator',
      permLevel: 'Moderator',
      guildOnly: true
    });
  }

  async run (msg, args) {
    if (!msg.member.permissions.has('BanMembers')) return msg.channel.send('You are missing the Ban Members permission.');
    if (!msg.guild.members.me.permissions.has('BanMembers')) return msg.channel.send('The bot is missing Ban Members permission.');

    if (!args || args.length < 1) return msg.channel.send(`Incorrect Usage: ${msg.settings.prefix}Unban <userID> [reason]`);
    const logChan = db.get(`servers.${msg.guild.id}.logs.channel`);

    const regex = /\d+/g;
    const userID = args[0];
    args.shift();
    const reason = args.join(' ');

    if (!userID.matches(regex)) return msg.channel.send(`Please provide a valid User ID. \nInput: ${userID}`);
    if (msg.guild.members.me.permissions.has('ManageMessages')) msg.delete();

    try {
      const banList = await msg.guild.fetchBans();
      const bannedUser = banList.find(user => user.id === userID);

      if (!bannedUser) return msg.channel.send(`The user with the ID ${userID} is not banned.`);

      const unbanP = await msg.guild.bans.remove(userID, { reason }).catch(err => { return msg.channel.send(`An error occurred: ${err}`); });
      const embed = new EmbedBuilder()
        .setTitle('Member Unbanned')
        .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() })
        .setColor('#00FF00')
        .addFields([
          { name: 'User', value: unbanP.toString() },
          { name: 'Unbanned By', value: msg.member.toString() },
          { name: 'Reason', value: reason }
        ])
        .setFooter({ text: `ID: ${unbanP.id}` })
        .setTimestamp();

      if (logChan) {
        const em2 = new EmbedBuilder()
          .setTitle('User unbanned')
          .setColor('#00FF00')
          .setAuthor({ name: msg.member.displayName, iconURL: msg.author.displayAvatarURL() })
          .setDescription('Full info posted in the log channel.');

        msg.guild.channels.cache.get(logChan).send({ embeds: [embed] });
        return msg.channel.send({ embeds: [em2] })
          .then(msg => {
            setTimeout(() => msg.delete(), 30000);
          });
      } else {
        return msg.channel.send({ embeds: [embed] });
      }
    } catch (err) {
      return msg.channel.send(`An error occurred: ${err}`);
    }
  }
}

module.exports = Unban;
